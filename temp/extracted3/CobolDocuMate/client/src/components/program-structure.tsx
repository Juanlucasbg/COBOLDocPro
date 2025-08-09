import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Database, Settings, Code } from "lucide-react";
import { type CobolProgram, type CobolStructure } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface ProgramStructureProps {
  program: CobolProgram;
}

export default function ProgramStructure({ program }: ProgramStructureProps) {
  const [openSections, setOpenSections] = useState<string[]>(['identification', 'data', 'procedure']);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (program.status !== 'processed' || !program.programStructure) {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <Code className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Program Structure Not Available
            </h3>
            <p className="text-carbon-gray-80">
              Structure analysis will be available once documentation processing is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let structure: CobolStructure;
  try {
    structure = JSON.parse(program.programStructure);
  } catch {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <Code className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Invalid Structure Data
            </h3>
            <p className="text-carbon-gray-80">
              The program structure data appears to be corrupted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
      <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
        <div className="p-8">
          <h1 className="text-3xl font-semibold text-carbon-gray-100 mb-6">
            Program Structure Analysis
          </h1>

          <div className="space-y-6">
            {/* Identification Division */}
            <Collapsible
              open={openSections.includes('identification')}
              onOpenChange={() => toggleSection('identification')}
            >
              <CollapsibleTrigger className="flex items-center space-x-2 w-full text-left p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                {openSections.includes('identification') ? (
                  <ChevronDown className="h-5 w-5 text-carbon-blue" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-carbon-blue" />
                )}
                <FileText className="h-5 w-5 text-carbon-blue" />
                <h2 className="text-xl font-semibold text-carbon-gray-100">
                  IDENTIFICATION DIVISION
                </h2>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 pl-6">
                <div className="space-y-3">
                  {structure.identification.programId && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">PROGRAM-ID</Badge>
                      <code className="bg-carbon-gray-10 px-2 py-1 rounded text-sm">
                        {structure.identification.programId}
                      </code>
                    </div>
                  )}
                  {structure.identification.author && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">AUTHOR</Badge>
                      <span className="text-carbon-gray-80">{structure.identification.author}</span>
                    </div>
                  )}
                  {structure.identification.dateWritten && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">DATE-WRITTEN</Badge>
                      <span className="text-carbon-gray-80">{structure.identification.dateWritten}</span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Environment Division */}
            {structure.environment && (
              <Collapsible
                open={openSections.includes('environment')}
                onOpenChange={() => toggleSection('environment')}
              >
                <CollapsibleTrigger className="flex items-center space-x-2 w-full text-left p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  {openSections.includes('environment') ? (
                    <ChevronDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-green-600" />
                  )}
                  <Settings className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-carbon-gray-100">
                    ENVIRONMENT DIVISION
                  </h2>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 pl-6">
                  <div className="space-y-4">
                    {structure.environment.configuration && (
                      <div>
                        <h4 className="font-medium text-carbon-gray-100 mb-2">Configuration Section</h4>
                        <ul className="space-y-1">
                          {structure.environment.configuration.map((item, index) => (
                            <li key={index} className="text-sm text-carbon-gray-80">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {structure.environment.inputOutput && (
                      <div>
                        <h4 className="font-medium text-carbon-gray-100 mb-2">Input-Output Section</h4>
                        <ul className="space-y-1">
                          {structure.environment.inputOutput.map((item, index) => (
                            <li key={index} className="text-sm text-carbon-gray-80">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Data Division */}
            <Collapsible
              open={openSections.includes('data')}
              onOpenChange={() => toggleSection('data')}
            >
              <CollapsibleTrigger className="flex items-center space-x-2 w-full text-left p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                {openSections.includes('data') ? (
                  <ChevronDown className="h-5 w-5 text-purple-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-purple-600" />
                )}
                <Database className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-semibold text-carbon-gray-100">
                  DATA DIVISION
                </h2>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 pl-6">
                <div className="space-y-6">
                  {/* Working Storage */}
                  <div>
                    <h4 className="font-medium text-carbon-gray-100 mb-3">Working Storage Section</h4>
                    <div className="bg-carbon-gray-10 rounded-lg p-4">
                      {structure.data.workingStorage.length > 0 ? (
                        <div className="space-y-2">
                          {structure.data.workingStorage.map((item, index) => (
                            <div key={index} className="flex items-center space-x-4 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {item.level}
                              </Badge>
                              <code className="font-mono text-carbon-gray-100">{item.name}</code>
                              {item.picture && (
                                <span className="text-carbon-gray-80">PIC {item.picture}</span>
                              )}
                              {item.value && (
                                <span className="text-carbon-gray-80">VALUE {item.value}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-carbon-gray-80">No working storage items found</p>
                      )}
                    </div>
                  </div>

                  {/* File Section */}
                  <div>
                    <h4 className="font-medium text-carbon-gray-100 mb-3">File Section</h4>
                    <div className="bg-carbon-gray-10 rounded-lg p-4">
                      {structure.data.fileSection.length > 0 ? (
                        <div className="space-y-4">
                          {structure.data.fileSection.map((file, index) => (
                            <div key={index} className="border border-carbon-gray-20 rounded p-3">
                              <h5 className="font-medium text-carbon-gray-100 mb-2">{file.name}</h5>
                              <p className="text-xs text-carbon-gray-80 mb-2">{file.selectClause}</p>
                              <div className="space-y-1">
                                {file.record.map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex items-center space-x-4 text-sm">
                                    <Badge variant="outline" className="text-xs">
                                      {item.level}
                                    </Badge>
                                    <code className="font-mono text-carbon-gray-100">{item.name}</code>
                                    {item.picture && (
                                      <span className="text-carbon-gray-80">PIC {item.picture}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-carbon-gray-80">No file definitions found</p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Procedure Division */}
            <Collapsible
              open={openSections.includes('procedure')}
              onOpenChange={() => toggleSection('procedure')}
            >
              <CollapsibleTrigger className="flex items-center space-x-2 w-full text-left p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                {openSections.includes('procedure') ? (
                  <ChevronDown className="h-5 w-5 text-orange-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-orange-600" />
                )}
                <Code className="h-5 w-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-carbon-gray-100">
                  PROCEDURE DIVISION
                </h2>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 pl-6">
                <div className="space-y-6">
                  {/* Sections */}
                  {structure.procedure.sections.length > 0 && (
                    <div>
                      <h4 className="font-medium text-carbon-gray-100 mb-3">Sections</h4>
                      <div className="space-y-2">
                        {structure.procedure.sections.map((section, index) => (
                          <div key={index} className="bg-carbon-gray-10 rounded-lg p-3">
                            <h5 className="font-medium text-carbon-gray-100">{section.name}</h5>
                            {section.description && (
                              <p className="text-sm text-carbon-gray-80 mt-1">{section.description}</p>
                            )}
                            {section.paragraphs.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-carbon-gray-80 mb-1">Paragraphs:</p>
                                <div className="flex flex-wrap gap-1">
                                  {section.paragraphs.map((para, paraIndex) => (
                                    <Badge key={paraIndex} variant="secondary" className="text-xs">
                                      {para}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paragraphs */}
                  <div>
                    <h4 className="font-medium text-carbon-gray-100 mb-3">Paragraphs</h4>
                    <div className="space-y-3">
                      {structure.procedure.paragraphs.length > 0 ? (
                        structure.procedure.paragraphs.map((paragraph, index) => (
                          <div key={index} className="bg-carbon-gray-10 rounded-lg p-4">
                            <h5 className="font-medium text-carbon-gray-100 mb-2">{paragraph.name}</h5>
                            {paragraph.description && (
                              <p className="text-sm text-carbon-gray-80 mb-3">{paragraph.description}</p>
                            )}
                            <div className="space-y-2">
                              {paragraph.statements.map((statement, stmtIndex) => (
                                <div key={stmtIndex} className="text-sm text-carbon-gray-80 pl-4 border-l-2 border-carbon-gray-20">
                                  {statement}
                                </div>
                              ))}
                            </div>
                            {(paragraph.calls && paragraph.calls.length > 0) && (
                              <div className="mt-3">
                                <p className="text-xs text-carbon-gray-80 mb-1">Calls:</p>
                                <div className="flex flex-wrap gap-1">
                                  {paragraph.calls.map((call, callIndex) => (
                                    <Badge key={callIndex} variant="outline" className="text-xs">
                                      {call}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-carbon-gray-80">No paragraphs found</p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
