import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search as SearchIcon, 
  Filter, 
  Clock, 
  FileCode, 
  BookOpen, 
  Database,
  ExternalLink,
  Bookmark,
  Copy,
  TrendingUp,
  Users,
  Tag
} from "lucide-react";
import type { CobolProgram, Documentation, SearchHistory } from "@shared/schema";

interface SearchResult {
  type: 'program' | 'documentation';
  item: CobolProgram | Documentation;
  score: number;
  highlights: string[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("search");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock user ID - in real app this would come from auth context
  const currentUserId = 1;

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: searchHistory } = useQuery({
    queryKey: ['/api/users', currentUserId, 'search-history'],
  });

  const addSearchHistoryMutation = useMutation({
    mutationFn: async (data: { query: string; resultCount: number }) => {
      return apiRequest('POST', '/api/search/history', {
        userId: currentUserId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'search-history'] });
    },
  });

  const performSearch = async () => {
    if (!query.trim() || query.length < 2) {
      toast({
        title: "Invalid Search",
        description: "Search query must be at least 2 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results: SearchResult[] = [];

      // Search programs if not filtered to documentation only
      if (searchType === "all" || searchType === "programs") {
        const programsUrl = projectFilter === "all" 
          ? `/api/search/programs?q=${encodeURIComponent(query)}`
          : `/api/search/programs?q=${encodeURIComponent(query)}&projectId=${projectFilter}`;
          
        const programResponse = await fetch(programsUrl, { credentials: 'include' });
        if (programResponse.ok) {
          const programs = await programResponse.json();
          programs.forEach((program: CobolProgram) => {
            results.push({
              type: 'program',
              item: program,
              score: calculateRelevanceScore(query, program.name + ' ' + program.content),
              highlights: findHighlights(query, program.content)
            });
          });
        }
      }

      // Search documentation if not filtered to programs only
      if (searchType === "all" || searchType === "documentation") {
        const docResponse = await fetch(`/api/search/documentation?q=${encodeURIComponent(query)}`, { 
          credentials: 'include' 
        });
        if (docResponse.ok) {
          const docs = await docResponse.json();
          docs.forEach((doc: Documentation) => {
            results.push({
              type: 'documentation',
              item: doc,
              score: calculateRelevanceScore(query, doc.title + ' ' + doc.content),
              highlights: findHighlights(query, doc.content)
            });
          });
        }
      }

      // Sort by relevance score
      results.sort((a, b) => b.score - a.score);
      setSearchResults(results);

      // Add to search history
      addSearchHistoryMutation.mutate({
        query,
        resultCount: results.length
      });

    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const calculateRelevanceScore = (query: string, content: string): number => {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    let score = 0;
    
    // Exact phrase match gets highest score
    if (contentLower.includes(queryLower)) {
      score += 100;
    }
    
    // Individual word matches
    const queryWords = queryLower.split(/\s+/);
    queryWords.forEach(word => {
      if (word.length > 2) {
        const wordMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += wordMatches * 10;
      }
    });
    
    return score;
  };

  const findHighlights = (query: string, content: string): string[] => {
    const queryLower = query.toLowerCase();
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    
    return sentences
      .filter(sentence => sentence.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map(sentence => sentence.trim());
  };

  const highlightText = (text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-400/30 text-yellow-200">$1</mark>');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const handleHistorySearch = (historicalQuery: string) => {
    setQuery(historicalQuery);
    setTimeout(() => performSearch(), 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Advanced Search</h1>
        <p className="text-slate-400">Search across all COBOL programs, documentation, and knowledge base</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="search" className="data-[state=active]:bg-blue-600">
            Search
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-blue-600">
            Search History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Search Interface */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Main Search Bar */}
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search programs, documentation, dependencies..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-12 h-12 text-lg bg-slate-700 border-slate-600 focus:border-blue-500"
                  />
                  <Button
                    onClick={performSearch}
                    disabled={isSearching || query.length < 2}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Search Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Filters:</span>
                  </div>
                  
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Content</SelectItem>
                      <SelectItem value="programs">Programs Only</SelectItem>
                      <SelectItem value="documentation">Documentation Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects?.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-slate-100 flex items-center justify-between">
                  <span>Search Results ({searchResults.length})</span>
                  <Badge className="bg-blue-600 text-white">
                    Query: "{query}"
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <div className="p-4 space-y-4">
                    {searchResults.map((result, index) => (
                      <div 
                        key={`${result.type}-${(result.item as any).id}`}
                        className="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {result.type === 'program' ? (
                              <FileCode className="w-5 h-5 text-blue-400" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-green-400" />
                            )}
                            <h3 className="font-medium text-slate-100">
                              {result.type === 'program' 
                                ? (result.item as CobolProgram).name 
                                : (result.item as Documentation).title}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={result.type === 'program' ? 'text-blue-300' : 'text-green-300'}
                            >
                              {result.type.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400">
                              Score: {result.score}%
                            </span>
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {result.highlights.length > 0 && (
                          <div className="space-y-2">
                            {result.highlights.map((highlight, idx) => (
                              <p 
                                key={idx}
                                className="text-sm text-slate-300 bg-slate-800 p-2 rounded"
                                dangerouslySetInnerHTML={{ 
                                  __html: highlightText(highlight, query) 
                                }}
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                          <span>
                            {result.type === 'program' 
                              ? `${(result.item as CobolProgram).linesOfCode} lines`
                              : `Updated ${new Date((result.item as Documentation).updatedAt).toLocaleDateString()}`}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-slate-400 hover:text-slate-200"
                            >
                              <Bookmark className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-slate-400 hover:text-slate-200"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* No Results State */}
          {searchResults.length === 0 && query && !isSearching && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <SearchIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Results Found</h3>
                <p className="text-slate-400 mb-6">
                  No content matches your search for "{query}". Try different keywords or check your filters.
                </p>
                <div className="space-y-2 text-sm text-slate-400">
                  <p>Search tips:</p>
                  <ul className="text-left inline-block space-y-1">
                    <li>• Use specific COBOL terms or program names</li>
                    <li>• Try searching for function names or data structures</li>
                    <li>• Remove filters to broaden your search</li>
                    <li>• Check spelling and try synonyms</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!query && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <SearchIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">Start Your Search</h3>
                <p className="text-slate-400 mb-6">
                  Search across all COBOL programs, documentation, and dependencies in your knowledge base.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setQuery("CALL ")}
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    CALL statements
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setQuery("COPY ")}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    COPY books
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setQuery("PERFORM ")}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    PERFORM loops
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-slate-100 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span>Recent Searches</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {searchHistory?.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No search history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchHistory?.map((search: SearchHistory) => (
                    <div 
                      key={search.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleHistorySearch(search.query)}
                    >
                      <div className="flex items-center space-x-3">
                        <SearchIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{search.query}</span>
                        <Badge variant="outline" className="text-xs">
                          {search.resultCount} results
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(search.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-slate-100 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span>Search Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Searches</span>
                    <span className="text-2xl font-bold text-slate-100">
                      {searchHistory?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Most Active Day</span>
                    <span className="text-slate-100">Today</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Average Results</span>
                    <span className="text-slate-100">
                      {searchHistory?.length > 0 
                        ? Math.round(searchHistory.reduce((sum: number, s: SearchHistory) => sum + s.resultCount, 0) / searchHistory.length)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-slate-100 flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  <span>Popular Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {['CALL', 'COPY', 'PERFORM', 'MOVE', 'IF'].map((term, index) => (
                    <div key={term} className="flex items-center justify-between">
                      <span className="text-slate-300">{term}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.max(1, 10 - index * 2)} searches
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
