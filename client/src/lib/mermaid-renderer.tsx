import { useEffect, useRef, useState } from "react";
// @ts-ignore - Mermaid module typing issues
import mermaid from "mermaid";

// Initialize Mermaid with dark theme configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  themeVariables: {
    primaryColor: '#22c55e',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#16a34a',
    lineColor: '#374151',
    sectionBkgColor: '#1f2937',
    altSectionBkgColor: '#111827',
    gridColor: '#374151',
    secondaryColor: '#1f2937',
    tertiaryColor: '#374151'
  }
});

interface MermaidDiagramProps {
  code: string;
  id: string;
  className?: string;
}

export function MermaidDiagram({ code, id, className = "" }: MermaidDiagramProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!elementRef.current || !code) return;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Clear previous content
        elementRef.current!.innerHTML = '';
        
        // Generate unique ID for this diagram
        const diagramId = `mermaid-${id}-${Date.now()}`;
        
        // Validate and render the diagram
        const isValid = await mermaid.parse(code);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }
        
        // Render the diagram
        const { svg } = await mermaid.render(diagramId, code);
        
        // Insert the SVG
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
          
          // Style the SVG to be responsive and fit our theme
          const svgElement = elementRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';
            svgElement.style.maxWidth = '100%';
            svgElement.style.background = 'transparent';
            
            // Apply dark theme styles to paths and text
            const paths = svgElement.querySelectorAll('path');
            paths.forEach(path => {
              if (path.getAttribute('stroke') === '#000000') {
                path.setAttribute('stroke', '#22c55e');
              }
            });
            
            const texts = svgElement.querySelectorAll('text');
            texts.forEach(text => {
              text.setAttribute('fill', '#ffffff');
            });
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
        
        if (elementRef.current) {
          elementRef.current.innerHTML = `
            <div class="text-center p-8 bg-red-900/20 rounded-lg border border-red-500/30">
              <div class="text-red-400 mb-2">Diagram Rendering Error</div>
              <div class="text-sm text-gray-400 mb-4">${error instanceof Error ? error.message : 'Invalid diagram syntax'}</div>
              <pre class="text-xs mt-4 p-4 bg-gray-900 rounded text-left overflow-auto text-gray-300 max-h-32">${code}</pre>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [code, id]);

  if (isLoading) {
    return (
      <div className={`w-full min-h-[300px] flex items-center justify-center bg-gray-900/50 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
          <div className="text-sm text-gray-400">Generating diagram...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef}
      className={`w-full min-h-[300px] flex items-center justify-center bg-gray-900/30 rounded-lg border border-gray-700 p-4 ${className}`}
    />
  );
}

// Hook for easy Mermaid diagram generation
export function useMermaidDiagram(code: string, id: string) {
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateCode = async () => {
      try {
        const parseResult = await mermaid.parse(code);
        // Handle the parse result properly - it may be boolean or object
        const isValidResult = typeof parseResult === 'boolean' ? parseResult : parseResult.valid !== false;
        setIsValid(isValidResult);
        setError(null);
      } catch (err) {
        setIsValid(false);
        setError(err instanceof Error ? err.message : 'Invalid syntax');
      }
    };

    if (code) {
      validateCode();
    }
  }, [code]);

  return { isValid, error };
}

// Utility function to generate common COBOL diagrams
export function generateCobolFlowchart(programName: string, paragraphs: string[]): string {
  let mermaid = 'flowchart TD\n';
  mermaid += `  Start([${programName} Start]) --> Init[Initialize Variables]\n`;
  
  paragraphs.forEach((paragraph, index) => {
    const nodeId = `P${index}`;
    const prevNodeId = index === 0 ? 'Init' : `P${index - 1}`;
    mermaid += `  ${prevNodeId} --> ${nodeId}[${paragraph}]\n`;
  });
  
  if (paragraphs.length > 0) {
    mermaid += `  P${paragraphs.length - 1} --> End([Program End])\n`;
  } else {
    mermaid += `  Init --> End([Program End])\n`;
  }
  
  return mermaid;
}

export function generateDataStructureDiagram(dataItems: Array<{name: string, level: number, picture?: string}>): string {
  let mermaid = 'graph LR\n';
  
  // Group by level for hierarchy
  const levels = new Map<number, typeof dataItems>();
  dataItems.forEach(item => {
    if (!levels.has(item.level)) {
      levels.set(item.level, []);
    }
    levels.get(item.level)!.push(item);
  });
  
  // Create nodes
  dataItems.forEach(item => {
    const nodeId = item.name.replace(/[^A-Z0-9]/g, '_');
    const label = item.picture ? `${item.name}<br/>PIC ${item.picture}` : item.name;
    mermaid += `  ${nodeId}[${label}]\n`;
  });
  
  // Create connections based on hierarchy
  const sortedLevels = Array.from(levels.keys()).sort();
  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const currentLevel = levels.get(sortedLevels[i])!;
    const nextLevel = levels.get(sortedLevels[i + 1])!;
    
    currentLevel.forEach(parent => {
      nextLevel.forEach(child => {
        if (child.level > parent.level) {
          const parentId = parent.name.replace(/[^A-Z0-9]/g, '_');
          const childId = child.name.replace(/[^A-Z0-9]/g, '_');
          mermaid += `  ${parentId} --> ${childId}\n`;
        }
      });
    });
  }
  
  return mermaid;
}