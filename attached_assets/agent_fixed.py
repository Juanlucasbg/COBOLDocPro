import os
import json
import logging
import requests
from datetime import datetime
from utils.observability import agent_monitor, observability_tracker
from utils.mcp_client import mcp_client
from utils.llm_selector import llm_selector
from utils.groq_client import mk_groq_client, get_groq_models, analyze_cobol_with_groq

# Initialize logger
logger = logging.getLogger(__name__)

class COBOLDocumentationAgent:
    """Autonomous agent for generating and managing COBOL documentation"""
    
    def __init__(self, session_id=None, user_id=None):
        self.session_id = agent_monitor.start_session(
            session_id=session_id,
            user_id=user_id,
            context={"agent_type": "cobol_documentation"}
        )
        self.memory = []
        self.user_preferences = {}
        self.max_memory_items = 10
        
        # Set up LLM provider preference
        self.llm_provider = self.get_user_preference("llm_provider", "groq")
        self.llm_model = self.get_user_preference("llm_model", "llama-3.3-70b-versatile")
        
        # Initialize LLM selector
        if llm_selector.get_providers():
            # Use the preferred provider if available
            if self.llm_provider in llm_selector.get_providers():
                llm_selector.set_provider(self.llm_provider)
            # If model preference exists, try to set it
            if self.llm_model:
                llm_selector.set_model(self.llm_model)
                
        logger.info(f"Initialized COBOL Documentation Agent with session {self.session_id} using LLM provider: {self.llm_provider}")
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        try:
            if hasattr(self, 'session_id'):
                agent_monitor.end_session()
        except:
            pass
    
    def set_user_preference(self, key, value):
        """Set a user preference"""
        self.user_preferences[key] = value
        logger.debug(f"Set user preference: {key} = {value}")
    
    def get_user_preference(self, key, default=None):
        """Get a user preference"""
        return self.user_preferences.get(key, default)
    
    def remember(self, item_type, content):
        """Add an item to agent memory"""
        memory_item = {
            "type": item_type,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.memory.append(memory_item)
        
        # Limit memory size
        if len(self.memory) > self.max_memory_items:
            self.memory.pop(0)
            
        logger.debug(f"Added memory item: {item_type}")
        return memory_item
    
    def analyze_cobol_structure(self, cobol_code, parsed_structure=None):
        """Analyze COBOL code structure autonomously"""
        operation_span = observability_tracker.start_span(
            "analyze_cobol_structure", 
            metadata={"code_length": len(cobol_code)}
        )
        
        try:
            # Agent decision: determine what parsing approach to use
            parsing_decision = agent_monitor.log_decision(
                "parsing_approach_selection",
                inputs={"code_sample": cobol_code[:200] + "..."},
                reasoning="Determining the optimal parsing strategy based on code complexity and structure"
            )
            
            # If no parsed structure provided, use a simplified one
            if not parsed_structure:
                parsed_structure = {
                    "program_id": self._extract_program_id(cobol_code),
                    "divisions": self._identify_divisions(cobol_code)
                }
                
            # Agent decision: identify key code aspects to focus on
            focus_decision = agent_monitor.log_decision(
                "code_focus_identification",
                inputs={"parsed_structure": parsed_structure},
                reasoning="Identifying the most important aspects of the code to focus documentation on",
                output={"focus_areas": self._identify_focus_areas(parsed_structure)}
            )
            
            # Prepare custom instructions based on user preferences
            custom_instructions = ""
            if self.get_user_preference("detail_level") == "high":
                custom_instructions += "Provide highly detailed analysis with comprehensive breakdown of all code elements. "
            elif self.get_user_preference("detail_level") == "low":
                custom_instructions += "Provide a simplified overview focusing only on key program elements. "
                
            if self.get_user_preference("audience") == "technical":
                custom_instructions += "Target audience is technical developers with COBOL expertise. "
            elif self.get_user_preference("audience") == "business":
                custom_instructions += "Target audience is business stakeholders with limited technical knowledge. "
            
            # Determine which LLM provider to use based on user preference
            current_provider = self.get_user_preference("llm_provider", "groq")
            current_model = self.get_user_preference("llm_model", "llama-3.3-70b-versatile")
            
            # Prepare the prompt/messages for the LLM
            prompt = f"""
            You are an expert COBOL analyst. Analyze the following COBOL code and extract its structure,
            including program flow, variables, and logic. Format your response as JSON and include:
            
            1. program_id: The program identifier
            2. description: A concise overview of what the program does
            3. divisions: An object containing each division with:
               - description: What this division does
               - sections: An object of sections within the division, each with:
                 - description: What this section does
                 - paragraphs: An object of paragraphs, each with code and description
            4. variables: Key variables and their purpose
            5. flow_diagram: A simple Mermaid flowchart diagram of the program flow
            
            Use this initial parsed structure as reference: {json.dumps(parsed_structure, indent=2)}
            
            COBOL CODE:
            ```cobol
            {cobol_code}
            ```
            
            {custom_instructions}
            
            Respond with only valid JSON that represents the structured analysis of this code.
            """
            
            # Try using the LLM selector first
            if current_provider in llm_selector.get_providers():
                logger.info(f"Using LLM selector with provider {current_provider}")
                result = llm_selector.generate_text(
                    prompt=prompt,
                    provider=current_provider,
                    model=current_model,
                    temperature=0.2,
                    max_tokens=4000
                )
            # Fallback to using Groq directly if it's requested but not in selector
            elif current_provider == "groq" and os.environ.get("GROQ_API_KEY"):
                logger.info("Using Groq client directly")
                structured_data = analyze_cobol_with_groq(cobol_code, current_model)
                # Skip the JSON parsing since Groq already returns parsed JSON
                observability_tracker.end_span(operation_span, result=structured_data)
                return structured_data
            # Use Groq as only fallback option
            else:
                # Try direct GROQ access if API key exists
                if os.environ.get("GROQ_API_KEY"):
                    logger.info("GROQ API key exists, using direct Groq client")
                    structured_data = analyze_cobol_with_groq(cobol_code, "llama-3.3-70b-versatile")
                    # Skip the JSON parsing since Groq already returns parsed JSON
                    observability_tracker.end_span(operation_span, result=structured_data)
                    return structured_data
                else:
                    # No API keys available
                    logger.error("No GROQ API key available for documentation generation")
                    structured_data = {
                        "program_id": self._extract_program_id(cobol_code),
                        "description": "Error: No API keys available for any LLM provider",
                        "divisions": self._identify_divisions(cobol_code),
                        "variables": {},
                        "flow_diagram": "flowchart TD\n    Error[Error: No API Keys] --> Action[Please configure API keys]"
                    }
                    observability_tracker.end_span(operation_span, result=structured_data)
                    return structured_data
            
            # Clean up the result to make sure it's valid JSON
            # Remove any non-JSON content like markdown formatting
            try:
                # Try to find JSON content within triple backticks if present
                import re
                json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', result)
                if json_match:
                    result = json_match.group(1).strip()
                else:
                    # If not in code blocks, just try to parse it directly
                    result = result.strip()
                    
                # Parse the JSON
                structured_data = json.loads(result)
                
                logger.debug(f"Successfully parsed structured data from LLM API response")
            except Exception as json_error:
                logger.error(f"Error parsing JSON from LLM response: {json_error}")
                logger.debug(f"Response content: {result[:500]}...")
                
                # Fallback to basic structure
                structured_data = {
                    "program_id": self._extract_program_id(cobol_code),
                    "description": "Could not automatically extract program description.",
                    "divisions": self._identify_divisions(cobol_code)
                }
            
            # Store analysis in memory
            self.remember("cobol_analysis", {
                "program_id": structured_data.get("program_id", "Unknown"),
                "description": structured_data.get("description", "No description available"),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Agent decision: evaluate analysis quality
            quality_decision = agent_monitor.log_decision(
                "analysis_quality_evaluation",
                reasoning="Evaluating the completeness and accuracy of the code analysis",
                output=self._evaluate_analysis_quality(structured_data)
            )
            
            observability_tracker.end_span(operation_span, result=structured_data)
            return structured_data
            
        except Exception as e:
            logger.error(f"Error analyzing COBOL structure: {str(e)}")
            observability_tracker.end_span(operation_span, error=e)
            raise
    
    def generate_documentation(self, structured_data):
        """Generate documentation from structured COBOL data"""
        operation_span = observability_tracker.start_span(
            "generate_documentation", 
            metadata={"program_id": structured_data.get("program_id", "Unknown")}
        )
        
        try:
            # Agent decision: determine documentation structure
            doc_structure_decision = agent_monitor.log_decision(
                "documentation_structure_planning",
                inputs={"structured_data_keys": list(structured_data.keys())},
                reasoning="Planning the optimal documentation structure based on available information",
                output={"planned_sections": self._plan_documentation_sections(structured_data)}
            )
            
            # Prepare custom instructions based on user preferences
            custom_instructions = ""
            audience_type = self.get_user_preference("audience", "technical")
            
            if self.get_user_preference("documentation_style") == "academic":
                custom_instructions += "Use a formal, academic style with precise terminology. "
            elif self.get_user_preference("documentation_style") == "conversational":
                custom_instructions += "Use a conversational style with accessible explanations. "
                
            if self.get_user_preference("include_examples") == True:
                custom_instructions += "Include practical examples for important code sections. "
                
            if self.get_user_preference("diagrams") == "detailed":
                custom_instructions += "Create detailed diagrams explaining program flow and structure. "
            
            # Enrich structured data with MCP
            agent_monitor.log_decision(
                "mcp_enrichment",
                reasoning="Enriching COBOL documentation with external knowledge and explanations using Model Context Protocol",
                output={"audience_type": audience_type}
            )
            
            try:
                enriched_data = mcp_client.enrich_cobol_documentation(structured_data, audience_type)
                
                # Log what was enriched
                agent_monitor.log_decision(
                    "mcp_enrichment_analysis",
                    reasoning="Analyzing MCP enrichment results",
                    output={
                        "enriched_fields": list(set(enriched_data.keys()) - set(structured_data.keys()))
                    }
                )
                
                # Use the enriched data for documentation
                structured_data = enriched_data
            except Exception as mcp_error:
                logger.warning(f"MCP enrichment failed, continuing with original data: {str(mcp_error)}")
                # Continue with the original structured data
            
            # Determine which LLM provider to use based on user preference
            current_provider = self.get_user_preference("llm_provider", "groq")
            current_model = self.get_user_preference("llm_model", "llama-3.3-70b-versatile")
            
            # Prepare MCP context if available
            mcp_context = ""
            if "mcp_explanation" in structured_data:
                mcp_context = f"\n\nExternal knowledge about this COBOL program:\n{structured_data['mcp_explanation'].get('explanation', '')}\n"
            
            # Prepare the documentation prompt
            doc_prompt = f"""
            You are a technical documentation expert specializing in legacy COBOL systems. 
            Create detailed, well-organized documentation for the following COBOL code structure.
            
            Follow these guidelines:
            1. Start with a clear title and overview of the program's purpose
            2. Create sections for each division with clear descriptions
            3. Include detailed explanations of the program flow and logic
            4. Embed Mermaid diagrams to visualize the program flow
            5. Add code examples for important sections
            6. Format your response as Markdown with proper headings, code blocks, and diagrams
            7. DO NOT include any HTML tags (no <pre>, <code>, <span>, <div>, etc.)
            8. Follow the documentation style shown in the Swimm documentation example
            
            {custom_instructions}
            
            Use this structured data: {json.dumps(structured_data, indent=2)}{mcp_context}
            
            Your documentation should be comprehensive, clear, and professional, suitable for both developers and non-technical stakeholders.
            """
            
            # Try using the LLM selector first
            if current_provider in llm_selector.get_providers():
                logger.info(f"Using LLM selector with provider {current_provider} for documentation generation")
                documentation = llm_selector.generate_text(
                    prompt=doc_prompt,
                    provider=current_provider,
                    model=current_model,
                    temperature=0.3,
                    max_tokens=4000
                )
            # Fallback to using Groq directly if it's requested but not in selector
            elif current_provider == "groq" and os.environ.get("GROQ_API_KEY"):
                logger.info("Using Groq client directly for documentation generation")
                try:
                    from utils.groq_client import generate_with_groq
                    documentation = generate_with_groq(
                        prompt=doc_prompt,
                        model=current_model or "llama-3.1-8b-versatile",
                        temperature=0.3,
                        max_tokens=4000
                    )
                except Exception as groq_error:
                    logger.error(f"Error using Groq directly: {str(groq_error)}")
                    # Fallback to Groq
                    documentation = self._fallback_to_groq_for_documentation(doc_prompt, custom_instructions)
            # Default approach - use GROQ exclusively
            else:
                # Use GROQ exclusively
                logger.info("Using GROQ for documentation generation")
                documentation = self._fallback_to_groq_for_documentation(doc_prompt, custom_instructions)
            
            # Agent decision: evaluate documentation quality
            quality_decision = agent_monitor.log_decision(
                "documentation_quality_evaluation",
                reasoning="Evaluating the quality, completeness, and clarity of the generated documentation",
                output=self._evaluate_documentation_quality(documentation)
            )
            
            # Generate diagrams if needed
            if "```mermaid" not in documentation or self.get_user_preference("enhanced_diagrams", False):
                documentation = self._enhance_with_diagrams(documentation, structured_data)
            
            # Add MCP explanations for non-technical users if available
            if audience_type != "technical" and "construct_explanations" in structured_data:
                documentation = self._add_mcp_explanations(documentation, structured_data)
                
            # Extract thinking process and format as separate section
            try:
                documentation = self._separate_thinking_process(documentation)
                logger.debug("Separated thinking process from main documentation")
            except Exception as e:
                logger.warning(f"Could not separate thinking process: {str(e)}")
                
            # Enhance documentation with tabbed diagram views
            try:
                from utils.mermaid_viewer import enhance_markdown_with_tabs
                documentation = enhance_markdown_with_tabs(documentation)
                logger.debug("Enhanced documentation with tabbed diagram views")
            except Exception as e:
                logger.warning(f"Could not enhance documentation with tabbed diagram views: {str(e)}")
            
            # Store in memory
            self.remember("documentation", {
                "program_id": structured_data.get("program_id", "Unknown"),
                "doc_preview": documentation[:200] + "..."
            })
            
            observability_tracker.end_span(operation_span, result={"doc_length": len(documentation)})
            return documentation
            
        except Exception as e:
            logger.error(f"Error generating documentation: {str(e)}")
            observability_tracker.end_span(operation_span, error=e)
            raise
    
    def _extract_program_id(self, cobol_code):
        """Extract program ID from COBOL code"""
        import re
        program_id_match = re.search(r'PROGRAM-ID\s*\.\s*([\w-]+)', cobol_code, re.IGNORECASE)
        if program_id_match:
            return program_id_match.group(1).strip()
        return "Unknown"
    
    def _identify_divisions(self, cobol_code):
        """Identify divisions in COBOL code"""
        import re
        divisions = []
        division_matches = re.finditer(r'([\w-]+)\s+DIVISION', cobol_code, re.IGNORECASE)
        
        for match in division_matches:
            divisions.append(match.group(1).strip())
            
        return divisions
    
    def _identify_focus_areas(self, parsed_structure):
        """Identify key areas to focus on in the code"""
        focus_areas = []
        
        # Identify data division for variables
        if "divisions" in parsed_structure and "DATA" in parsed_structure["divisions"]:
            focus_areas.append("data_structures")
            
        # Identify procedure division for logic
        if "divisions" in parsed_structure and "PROCEDURE" in parsed_structure["divisions"]:
            focus_areas.append("business_logic")
            
        # Always focus on program purpose
        focus_areas.append("program_purpose")
        
        return focus_areas
    
    def _evaluate_analysis_quality(self, structured_data):
        """Evaluate the quality of the code analysis"""
        quality_score = 0
        quality_notes = []
        
        # Check for required sections
        if "program_id" in structured_data and structured_data["program_id"] != "Unknown":
            quality_score += 1
        else:
            quality_notes.append("Missing program ID")
            
        if "description" in structured_data and len(structured_data.get("description", "")) > 20:
            quality_score += 1
        else:
            quality_notes.append("Description missing or too short")
            
        if "divisions" in structured_data and len(structured_data.get("divisions", {})) > 0:
            quality_score += 1
        else:
            quality_notes.append("No divisions identified")
            
        if "variables" in structured_data and len(structured_data.get("variables", {})) > 0:
            quality_score += 1
        else:
            quality_notes.append("No variables identified")
            
        if "flow_diagram" in structured_data and len(structured_data.get("flow_diagram", "")) > 50:
            quality_score += 1
        else:
            quality_notes.append("Flow diagram missing or incomplete")
            
        quality_level = "low" if quality_score < 2 else "medium" if quality_score < 4 else "high"
        
        return {
            "quality_score": quality_score,
            "quality_level": quality_level,
            "quality_notes": quality_notes
        }
    
    def _plan_documentation_sections(self, structured_data):
        """Plan the sections for documentation"""
        sections = ["Introduction", "Program Overview"]
        
        # Add divisions as sections
        if "divisions" in structured_data:
            for division in structured_data.get("divisions", {}):
                sections.append(f"{division} Division")
        
        # Add special sections based on content
        if "variables" in structured_data and len(structured_data.get("variables", {})) > 0:
            sections.append("Variables and Data Structures")
            
        if "flow_diagram" in structured_data:
            sections.append("Program Flow")
            
        sections.append("Summary")
        
        return sections
    
    def _evaluate_documentation_quality(self, documentation):
        """Evaluate the quality of generated documentation"""
        quality_score = 0
        quality_notes = []
        
        # Check length
        if len(documentation) > 1000:
            quality_score += 1
        else:
            quality_notes.append("Documentation is too short")
            
        # Check for headings (Markdown format)
        if documentation.count("#") > 3:
            quality_score += 1
        else:
            quality_notes.append("Too few section headings")
            
        # Check for code blocks
        if documentation.count("```") >= 2:  # At least one code block
            quality_score += 1
        else:
            quality_notes.append("No code examples included")
            
        # Check for Mermaid diagrams
        if "```mermaid" in documentation:
            quality_score += 1
        else:
            quality_notes.append("No diagrams included")
            
        # Check for explanation text
        if len(documentation.split()) > 300:  # More than 300 words
            quality_score += 1
        else:
            quality_notes.append("Insufficient explanation text")
            
        quality_level = "low" if quality_score < 2 else "medium" if quality_score < 4 else "high"
        
        return {
            "quality_score": quality_score,
            "quality_level": quality_level,
            "quality_notes": quality_notes
        }
    
    def _enhance_with_diagrams(self, documentation, structured_data):
        """Enhance documentation with additional diagrams"""
        operation_span = observability_tracker.start_span("enhance_with_diagrams")
        
        try:
            # Import validator from mermaid_validator
            from utils.mermaid_validator import validate_mermaid_syntax
            import re
            
            # Make sure we have at least one valid diagram
            has_valid_diagrams = False
            
            # First, validate any existing diagrams
            if "```mermaid" in documentation:
                logger.info(f"Found existing Mermaid diagrams in documentation. Validating and fixing if needed.")
                
                def validate_diagram(match):
                    nonlocal has_valid_diagrams
                    mermaid_code = match.group(1).strip()
                    
                    # Skip empty diagrams
                    if not mermaid_code:
                        logger.warning("Found empty Mermaid diagram, replacing with placeholder")
                        default_diagram = "flowchart TD\n    Empty[Empty Diagram] --> Placeholder[Placeholder]"
                        return f"```mermaid\n{default_diagram}\n```"
                    
                    # Validate and correct the diagram syntax
                    is_valid, corrected_code, message = validate_mermaid_syntax(mermaid_code)
                    
                    # Always consider it corrected, even if only validation happened
                    logger.debug(f"Mermaid diagram validation: {message}")
                    agent_monitor.log_decision(
                        "mermaid_syntax_correction",
                        reasoning=f"Validating/fixing Mermaid diagram syntax: {message}",
                        output={"original": mermaid_code, "corrected": corrected_code}
                    )
                    
                    # Mark as having valid diagrams now that we've fixed it
                    has_valid_diagrams = True
                    return f"```mermaid\n{corrected_code}\n```"
                
                # Extract and validate each mermaid diagram
                pattern = r'```mermaid\s*([\s\S]*?)\s*```'
                documentation = re.sub(pattern, validate_diagram, documentation)
            
            # Add fallback diagram if none exist or all were invalid
            if not has_valid_diagrams and "```mermaid" not in documentation:
                logger.info("No valid Mermaid diagrams found, adding a basic program flow diagram")
                
                # Create a basic diagram based on structured data
                program_id = structured_data.get("program_id", "Program")
                description = structured_data.get("description", "COBOL Program")
                
                # Generate a simple flowchart based on available data
                basic_flowchart = """```mermaid
flowchart TD
    Start([Start Program]) --> Init[Initialize Variables]
    Init --> Process[Process Data]
    Process --> Decision{Decision Point}
    Decision -->|Yes| Success[Success Path]
    Decision -->|No| Failure[Failure Path]
    Success --> End([End Program])
    Failure --> End
```"""
                
                # Add the basic diagram to the documentation
                documentation += f"\n\n## Program Flow Diagram\n\n{basic_flowchart}\n"
                has_valid_diagrams = True
                
                agent_monitor.log_decision(
                    "added_basic_diagram",
                    reasoning="Added a basic flow diagram as none were present",
                    output={"diagram_type": "flowchart"}
                )
            
            # Only try to generate enhanced diagrams if requested and we have an LLM provider
            provider_preference = self.get_user_preference("llm_provider", "groq")
            if self.get_user_preference("enhanced_diagrams", True) and provider_preference:
                logger.info(f"Attempting to generate enhanced diagrams using {provider_preference}")
                
                # Prepare detailed instructions for diagram generation
                diagram_instructions = """
You are a technical documentation expert who specializes in creating valid, error-free Mermaid diagrams.
Follow these STRICT Mermaid syntax rules to ensure all diagrams will render correctly:

1. Always start flowcharts with 'flowchart TD' (preferred) or direction (TB, LR, RL, BT)
2. All node IDs must be alphanumeric with NO spaces or special characters (except underscores)
3. Use proper arrow syntax (-->, --->, ==>, etc.) with NO spaces between dashes
4. Put quotes around any text with spaces
5. Balance all brackets, quotes, and parentheses
6. Each connection should follow this pattern: nodeA --> nodeB
7. For labels on connections, use: nodeA -->|"label text"| nodeB
8. Test each diagram carefully before returning it

GOOD EXAMPLE:
```mermaid
flowchart TD
    Start([Start]) --> Init[Initialize]
    Init --> Process[Process Data]
    Process --> Decision{Decision?}
    Decision -->|Yes| Success[Success]
    Decision -->|No| Failure[Failure]
    Success --> End([End])
    Failure --> End
```

BAD EXAMPLE (DON'T DO THIS):
```mermaid
flowchart
    start --> process data
    process data -> decision point
    decision point -- Yes --> Success route
    decision point -- No --> failure
```
"""
                
                # Try to use the selected LLM provider
                try:
                    enhanced_documentation = None
                    
                    # Use Groq exclusively
                    # Use Groq API to generate diagrams
                    from utils.groq_client import generate_with_groq
                    
                    # Use more concise prompt for Groq
                    enhanced_documentation = generate_with_groq(
                        prompt=f"""
Enhance this COBOL documentation with syntactically correct Mermaid diagrams:

{documentation}

Ensure all diagrams use valid syntax following these rules:
- Start flowcharts with 'flowchart TD'
- Use only alphanumeric IDs without spaces
- Use proper arrow syntax (-->)
- Put text with spaces in quotes

Return the complete enhanced documentation.
""",
                        model=self.llm_model,
                        temperature=0.2
                    )
                    
                    # If we successfully generated enhanced documentation
                    if enhanced_documentation:
                        # Validate all diagrams in the enhanced documentation
                        max_attempts = 2
                        attempts = 0
                        has_issues = True
                        
                        while has_issues and attempts < max_attempts:
                            has_issues = False
                            
                            def check_and_fix_diagram(match):
                                nonlocal has_issues
                                mermaid_code = match.group(1).strip()
                                
                                # Skip empty diagrams
                                if not mermaid_code:
                                    has_issues = True
                                    default_diagram = "flowchart TD\n    Empty[Empty Diagram] --> Placeholder[Placeholder]"
                                    return f"```mermaid\n{default_diagram}\n```"
                                
                                # Always validate and correct
                                is_valid, corrected_code, message = validate_mermaid_syntax(mermaid_code)
                                
                                if corrected_code != mermaid_code:
                                    has_issues = True
                                    logger.debug(f"Fixed Mermaid syntax: {message}")
                                
                                return f"```mermaid\n{corrected_code}\n```"
                            
                            # Find and fix all diagrams
                            pattern = r'```mermaid\s*([\s\S]*?)\s*```'
                            enhanced_documentation = re.sub(pattern, check_and_fix_diagram, enhanced_documentation)
                            attempts += 1
                        
                        # Count diagrams in original and enhanced documentation
                        original_count = documentation.count("```mermaid")
                        enhanced_count = enhanced_documentation.count("```mermaid")
                        
                        # Only use enhanced documentation if it actually contains diagrams
                        if enhanced_count > 0:
                            logger.info(f"Successfully enhanced documentation with {enhanced_count} diagrams (had {original_count} originally)")
                            documentation = enhanced_documentation
                        else:
                            logger.warning("Enhanced documentation didn't contain valid diagrams, keeping original")
                
                except Exception as api_error:
                    logger.error(f"Error generating enhanced diagrams: {str(api_error)}")
                    # Continue with the current documentation if enhancement fails
            
            # Log the completion of diagram enhancement
            agent_monitor.log_decision(
                "documentation_diagram_enhancement",
                reasoning="Enhanced documentation with validated Mermaid diagrams",
                output={"diagram_count": documentation.count("```mermaid")}
            )
            
            observability_tracker.end_span(operation_span)
            return documentation
                
        except Exception as e:
            logger.error(f"Error enhancing documentation with diagrams: {str(e)}")
            observability_tracker.end_span(operation_span, error=e)
            # Make sure we don't lose the original documentation if something goes wrong
            return documentation

    def _separate_thinking_process(self, documentation):
        """Separate AI thinking process from the main documentation and put it in its own section
        
        Args:
            documentation (str): The original documentation with thinking process mixed in
            
        Returns:
            str: Documentation with thinking process in a separate section
        """
        import re
        
        # First, identify the main documentation title using patterns like "# PROGRAM_NAME Documentation"
        # or "# Documentation for PROGRAM_NAME"
        doc_title_pattern = r'(^|\n)#\s+(.*?Documentation|Documentation for.*?)(\n|$)'
        title_match = re.search(doc_title_pattern, documentation, re.IGNORECASE)
        
        if title_match:
            # Title exists, extract content before it as thinking process
            title_pos = title_match.start()
            thinking_process = documentation[:title_pos].strip()
            main_documentation = documentation[title_pos:].strip()
            
            # Only add thinking process section if there's actually content
            if thinking_process:
                return f"{main_documentation}\n\n# Thinking Process\n\n{thinking_process}"
            else:
                return main_documentation
        
        # Check if there's any text before the first heading 
        first_heading_pattern = r'(^|\n)#\s+'
        first_heading_match = re.search(first_heading_pattern, documentation)
        
        if first_heading_match:
            # Extract content before first heading as thinking process
            heading_pos = first_heading_match.start()
            thinking_process = documentation[:heading_pos].strip()
            main_documentation = documentation[heading_pos:].strip()
            
            # Only add thinking process section if there's actually content
            if thinking_process:
                return f"{main_documentation}\n\n# Thinking Process\n\n{thinking_process}"
            else:
                return main_documentation
                
        # If no clear demarcation, leave as is
        return documentation
    
    def _fallback_to_groq_for_documentation(self, doc_prompt, custom_instructions):
        """Fallback to Groq API for documentation generation
        
        Args:
            doc_prompt (str): The documentation prompt
            custom_instructions (str): Custom instructions for the model
            
        Returns:
            str: Generated documentation
        """
        if not os.environ.get("GROQ_API_KEY"):
            logger.error("No Groq API key available")
            # Return minimal documentation when no API key is available
            return f"""
# COBOL Program Documentation

## Error: API Key Missing

Documentation generation failed because no Groq API key is available.

Please configure a GROQ_API_KEY in your environment settings.

```mermaid
flowchart TD
    Error[Error: No API Keys] --> Action[Please configure API keys]
```
"""
        
        logger.info("Using Groq API for documentation generation")
        try:
            from utils.groq_client import generate_with_groq
            documentation = generate_with_groq(
                prompt=f"You are a technical documentation expert who creates comprehensive, clear documentation for legacy COBOL systems. {custom_instructions}\n\n{doc_prompt}",
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=4000
            )
            return documentation
        except Exception as groq_error:
            logger.error(f"Error using GROQ: {str(groq_error)}")
            return f"""
# COBOL Program Documentation

## Error: Groq API Error

Documentation generation failed due to an error with the Groq API: {str(groq_error)}

Please check your GROQ_API_KEY and try again.
"""
    
    def _add_mcp_explanations(self, documentation, structured_data):
        """Add MCP explanations for non-technical users
        
        Args:
            documentation (str): The original documentation
            structured_data (dict): Structured data with MCP explanations
            
        Returns:
            str: Documentation enhanced with MCP explanations
        """
        operation_span = observability_tracker.start_span("add_mcp_explanations")
        
        try:
            # Create a new section for MCP explanations
            mcp_section = "\n\n## Simplified Explanations\n\n"
            mcp_section += "*The following explanations are designed for non-technical readers:*\n\n"
            
            # Add program explanation
            if "mcp_explanation" in structured_data:
                explanation = structured_data["mcp_explanation"].get("explanation", "")
                if explanation:
                    mcp_section += explanation + "\n\n"
            
            # Add explanations for complex constructs
            if "construct_explanations" in structured_data:
                for construct, explanation_data in structured_data["construct_explanations"].items():
                    explanation = explanation_data.get("explanation", "")
                    if explanation:
                        mcp_section += f"### {construct} Construct\n\n{explanation}\n\n"
            
            # Add visual elements if available
            if "visual_elements" in structured_data:
                for element_name, element_data in structured_data["visual_elements"].items():
                    if "visual_element" in element_data:
                        mcp_section += f"### {element_data.get('explanation', element_name)}\n\n{element_data['visual_element']}\n\n"
            
            # Add the MCP section to the documentation
            enhanced_documentation = documentation + mcp_section
            
            # Log the enhancement
            agent_monitor.log_decision(
                "mcp_explanation_addition",
                reasoning="Adding simplified explanations from MCP for non-technical users",
                output={"mcp_section_length": len(mcp_section)}
            )
            
            observability_tracker.end_span(operation_span)
            return enhanced_documentation
        
        except Exception as e:
            logger.error(f"Error adding MCP explanations: {str(e)}")
            observability_tracker.end_span(operation_span, error=e)
            return documentation  # Return the original documentation if something goes wrong
