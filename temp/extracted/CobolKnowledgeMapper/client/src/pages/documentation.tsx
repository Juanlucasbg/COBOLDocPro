import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  Brain, 
  Edit3, 
  Trash2, 
  Download,
  Share,
  Eye,
  Clock,
  User
} from "lucide-react";
import type { Documentation, CobolProgram, insertDocumentationSchema } from "@shared/schema";

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock user ID - in real app this would come from auth context
  const currentUserId = 1;

  const { data: documentation, isLoading: loadingDocs } = useQuery({
    queryKey: ['/api/documentation', selectedProgramId],
    queryFn: async () => {
      const url = selectedProgramId 
        ? `/api/documentation?programId=${selectedProgramId}` 
        : '/api/documentation';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch documentation');
      return response.json();
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['/api/programs'],
  });

  const createDocMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/documentation', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documentation'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Documentation created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create documentation",
        variant: "destructive",
      });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/documentation/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documentation'] });
      toast({
        title: "Success",
        description: "Documentation deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete documentation",
        variant: "destructive",
      });
    },
  });

  const filteredDocs = documentation?.filter((doc: Documentation) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  }) || [];

  const handleCreateDoc = async (formData: FormData) => {
    const data = {
      programId: parseInt(formData.get('programId') as string),
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      type: formData.get('type') as string,
      authorId: currentUserId,
      isPublic: formData.get('isPublic') === 'on'
    };
    
    createDocMutation.mutate(data);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_generated': return <Brain className="w-4 h-4 text-blue-400" />;
      case 'manual': return <Edit3 className="w-4 h-4 text-green-400" />;
      case 'annotation': return <FileText className="w-4 h-4 text-purple-400" />;
      default: return <BookOpen className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      ai_generated: "bg-blue-600 text-white",
      manual: "bg-green-600 text-white", 
      annotation: "bg-purple-600 text-white"
    };
    return variants[type as keyof typeof variants] || "bg-slate-600 text-white";
  };

  if (loadingDocs) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Documentation Center</h1>
          <p className="text-slate-400">Comprehensive COBOL system documentation and knowledge base</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Documentation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Create New Documentation</DialogTitle>
            </DialogHeader>
            <form action={handleCreateDoc} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Program</label>
                  <Select name="programId" required>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map((program: CobolProgram) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Type</label>
                  <Select name="type" defaultValue="manual" required>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="ai_generated">AI Generated</SelectItem>
                      <SelectItem value="annotation">Annotation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Title</label>
                <Input 
                  name="title" 
                  placeholder="Enter documentation title" 
                  className="bg-slate-700 border-slate-600"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Content</label>
                <Textarea 
                  name="content" 
                  placeholder="Enter documentation content..." 
                  className="bg-slate-700 border-slate-600 min-h-[200px]"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="isPublic" id="isPublic" className="rounded" defaultChecked />
                <label htmlFor="isPublic" className="text-sm text-slate-300">Make public</label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-slate-600"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createDocMutation.isPending}
                >
                  {createDocMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="ai_generated">AI Generated</SelectItem>
                  <SelectItem value="annotation">Annotations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-300">Program:</label>
              <Select value={selectedProgramId?.toString() || "all"} onValueChange={(value) => 
                setSelectedProgramId(value === "all" ? undefined : parseInt(value))
              }>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs?.map((program: CobolProgram) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Grid */}
      <div className="grid gap-6">
        {filteredDocs.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Documentation Found</h3>
              <p className="text-slate-400 mb-6">
                {searchQuery || selectedType !== "all" || selectedProgramId 
                  ? "No documentation matches your current filters." 
                  : "Start building your knowledge base by creating documentation."}
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Documentation
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((doc: Documentation) => (
            <Card key={doc.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
              <CardHeader className="border-b border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getTypeIcon(doc.type)}
                      <h3 className="text-lg font-semibold text-slate-100">{doc.title}</h3>
                      <Badge className={getTypeBadge(doc.type)}>
                        {doc.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {doc.isPublic && <Badge variant="outline">Public</Badge>}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>Author {doc.authorId}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      {doc.programId && (
                        <div className="flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>Program {doc.programId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200">
                      <Share className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteDocMutation.mutate(doc.id)}
                      disabled={deleteDocMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 leading-relaxed">
                    {doc.content.length > 300 
                      ? `${doc.content.substring(0, 300)}...` 
                      : doc.content}
                  </p>
                </div>
                
                {doc.content.length > 300 && (
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-blue-400 hover:text-blue-300 p-0"
                  >
                    Read more →
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Statistics */}
      {filteredDocs.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-100">{filteredDocs.length}</p>
                <p className="text-sm text-slate-400">Total Documents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {filteredDocs.filter(d => d.type === 'ai_generated').length}
                </p>
                <p className="text-sm text-slate-400">AI Generated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">
                  {filteredDocs.filter(d => d.type === 'manual').length}
                </p>
                <p className="text-sm text-slate-400">Manual Docs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {filteredDocs.filter(d => d.type === 'annotation').length}
                </p>
                <p className="text-sm text-slate-400">Annotations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
