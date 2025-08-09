import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { type DiagramData } from "@shared/schema";

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true
  }
});

export function generateDiagrams(mermaidCode: string, containerId: string): JSX.Element | null {
  const MermaidDiagram = ({ code, id }: { code: string; id: string }) => {
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (elementRef.current && code) {
        const renderDiagram = async () => {
          try {
            // Clear previous content
            elementRef.current!.innerHTML = '';
            
            // Generate unique ID for this diagram
            const diagramId = `mermaid-${id}-${Date.now()}`;
            
            // Render the diagram
            const { svg } = await mermaid.render(diagramId, code);
            
            // Insert the SVG
            if (elementRef.current) {
              elementRef.current.innerHTML = svg;
              
              // Style the SVG to be responsive
              const svgElement = elementRef.current.querySelector('svg');
              if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.maxWidth = '100%';
              }
            }
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            if (elementRef.current) {
              elementRef.current.innerHTML = `
                <div class="text-center p-8">
                  <div class="text-red-600 mb-2">Diagram Rendering Error</div>
                  <div class="text-sm text-gray-600">Invalid Mermaid syntax</div>
                  <pre class="text-xs mt-4 p-4 bg-gray-100 rounded text-left overflow-auto">${code}</pre>
                </div>
              `;
            }
          }
        };

        renderDiagram();
      }
    }, [code, id]);

    return React.createElement('div', {
      ref: elementRef,
      className: "w-full min-h-[300px] flex items-center justify-center",
      style: { minHeight: '300px' }
    });
  };

  return React.createElement(MermaidDiagram, { code: mermaidCode, id: containerId });
}

export function createFlowchartDiagram(structure: any): string {
  return `graph TD
    A[Start] --> B[Initialize Variables]
    B --> C[Read Input Data]
    C --> D[Process Business Logic]
    D --> E[Perform Calculations]
    E --> F[Validate Results]
    F --> G[Write Output]
    G --> H[End]
    
    D --> D1[Check Conditions]
    D1 --> D2[Apply Business Rules]
    D2 --> E
    
    F --> F1{Valid?}
    F1 -->|Yes| G
    F1 -->|No| C`;
}

export function createDataStructureDiagram(structure: any): string {
  return `graph LR
    A[Input Files] --> B[Working Storage]
    B --> C[Processing Areas]
    C --> D[Output Files]
    
    E[Master File] --> B
    F[Transaction File] --> B
    B --> G[Report File]
    B --> H[Updated Master]`;
}

export function createBusinessRulesDiagram(rules: any[]): string {
  return `graph TD
    A[Business Rules Engine] --> B[Input Validation]
    A --> C[Calculation Rules]
    A --> D[Decision Logic]
    A --> E[Output Formatting]
    
    B --> B1[Data Type Check]
    B --> B2[Range Validation]
    B --> B3[Format Verification]
    
    C --> C1[Tax Calculations]
    C --> C2[Salary Computations]
    C --> C3[Benefit Calculations]
    
    D --> D1[Eligibility Rules]
    D --> D2[Approval Logic]
    D --> D3[Exception Handling]`;
}

export function createProgramStructureDiagram(structure: any): string {
  return `graph TD
    A[IDENTIFICATION DIVISION] --> B[ENVIRONMENT DIVISION]
    B --> C[DATA DIVISION]
    C --> D[PROCEDURE DIVISION]
    
    C --> E[Working Storage Section]
    C --> F[File Section]
    C --> G[Linkage Section]
    
    D --> H[Main Processing]
    H --> I[Input Routines]
    H --> J[Calculation Routines]
    H --> K[Output Routines]
    H --> L[Error Handling]`;
}
