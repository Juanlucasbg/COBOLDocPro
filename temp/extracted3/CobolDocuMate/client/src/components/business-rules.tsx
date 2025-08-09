import { useState } from "react";
import { Calculator, CheckCircle, GitBranch, Workflow, Database } from "lucide-react";
import { type CobolProgram, type BusinessRule } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BusinessRulesProps {
  program: CobolProgram;
}

export default function BusinessRules({ program }: BusinessRulesProps) {
  if (program.status !== 'processed' || !program.businessRules) {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <Workflow className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Business Rules Not Available
            </h3>
            <p className="text-carbon-gray-80">
              Business rules analysis will be available once documentation processing is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let rules: BusinessRule[];
  try {
    rules = JSON.parse(program.businessRules);
  } catch {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <Workflow className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Invalid Business Rules Data
            </h3>
            <p className="text-carbon-gray-80">
              The business rules data appears to be corrupted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'calculation':
        return <Calculator className="h-4 w-4" />;
      case 'validation':
        return <CheckCircle className="h-4 w-4" />;
      case 'decision':
        return <GitBranch className="h-4 w-4" />;
      case 'process':
        return <Workflow className="h-4 w-4" />;
      case 'data-flow':
        return <Database className="h-4 w-4" />;
      default:
        return <Workflow className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'calculation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'validation':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'decision':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'process':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'data-flow':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const rulesByType = rules.reduce((acc, rule) => {
    if (!acc[rule.type]) {
      acc[rule.type] = [];
    }
    acc[rule.type].push(rule);
    return acc;
  }, {} as Record<string, BusinessRule[]>);

  const typeLabels = {
    calculation: 'Calculations',
    validation: 'Validations',
    decision: 'Decisions',
    process: 'Processes',
    'data-flow': 'Data Flow'
  };

  if (rules.length === 0) {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <Workflow className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              No Business Rules Found
            </h3>
            <p className="text-carbon-gray-80">
              No explicit business rules were detected in this COBOL program.
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
            Business Rules Analysis
          </h1>

          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(typeLabels).map(([type, label]) => {
                const count = rulesByType[type]?.length || 0;
                return (
                  <div key={type} className={`p-4 rounded-lg border ${getTypeColor(type)}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {getTypeIcon(type)}
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="all">All Rules</TabsTrigger>
              <TabsTrigger value="calculation">Calculations</TabsTrigger>
              <TabsTrigger value="validation">Validations</TabsTrigger>
              <TabsTrigger value="decision">Decisions</TabsTrigger>
              <TabsTrigger value="process">Processes</TabsTrigger>
              <TabsTrigger value="data-flow">Data Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-carbon-gray-20 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getTypeColor(rule.type)}`}>
                          {getTypeIcon(rule.type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-carbon-gray-100">
                            {rule.title}
                          </h3>
                          <Badge variant="secondary" className="mt-1">
                            {typeLabels[rule.type as keyof typeof typeLabels] || rule.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-carbon-gray-80">
                        <p>{rule.location.division}</p>
                        {rule.location.section && <p>{rule.location.section}</p>}
                        {rule.location.paragraph && <p>{rule.location.paragraph}</p>}
                      </div>
                    </div>

                    <p className="text-carbon-gray-80 mb-4">{rule.description}</p>

                    {rule.conditions && rule.conditions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-carbon-gray-100 mb-2">Conditions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {rule.conditions.map((condition, index) => (
                            <li key={index} className="text-sm text-carbon-gray-80">
                              {condition}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rule.actions && rule.actions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-carbon-gray-100 mb-2">Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {rule.actions.map((action, index) => (
                            <li key={index} className="text-sm text-carbon-gray-80">
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rule.relatedItems && rule.relatedItems.length > 0 && (
                      <div>
                        <h4 className="font-medium text-carbon-gray-100 mb-2">Related Items:</h4>
                        <div className="flex flex-wrap gap-1">
                          {rule.relatedItems.map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {Object.entries(typeLabels).map(([type, label]) => (
              <TabsContent key={type} value={type} className="mt-6">
                <div className="space-y-4">
                  {rulesByType[type]?.length > 0 ? (
                    rulesByType[type].map((rule) => (
                      <div key={rule.id} className="border border-carbon-gray-20 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${getTypeColor(rule.type)}`}>
                              {getTypeIcon(rule.type)}
                            </div>
                            <h3 className="text-lg font-medium text-carbon-gray-100">
                              {rule.title}
                            </h3>
                          </div>
                          <div className="text-sm text-carbon-gray-80">
                            <p>{rule.location.division}</p>
                            {rule.location.section && <p>{rule.location.section}</p>}
                            {rule.location.paragraph && <p>{rule.location.paragraph}</p>}
                          </div>
                        </div>

                        <p className="text-carbon-gray-80 mb-4">{rule.description}</p>

                        {rule.conditions && rule.conditions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-carbon-gray-100 mb-2">Conditions:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {rule.conditions.map((condition, index) => (
                                <li key={index} className="text-sm text-carbon-gray-80">
                                  {condition}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rule.actions && rule.actions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-carbon-gray-100 mb-2">Actions:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {rule.actions.map((action, index) => (
                                <li key={index} className="text-sm text-carbon-gray-80">
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rule.relatedItems && rule.relatedItems.length > 0 && (
                          <div>
                            <h4 className="font-medium text-carbon-gray-100 mb-2">Related Items:</h4>
                            <div className="flex flex-wrap gap-1">
                              {rule.relatedItems.map((item, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getTypeColor(type)}`}>
                        {getTypeIcon(type)}
                      </div>
                      <h3 className="text-lg font-semibold text-carbon-gray-100 mb-2">
                        No {label} Found
                      </h3>
                      <p className="text-carbon-gray-80">
                        No {label.toLowerCase()} rules were detected in this program.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
