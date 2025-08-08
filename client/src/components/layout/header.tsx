import { useState } from "react";
import { Search, Bell, Settings, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["/api/statistics"],
    refetchInterval: 30000,
  });

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Implement global search functionality
      console.log("Searching for:", query);
    }
  };

  return (
    <header className="bg-card/50 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4">
        {/* Quick Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{stats?.totalPrograms || 0}</div>
              <div className="text-xs text-muted-foreground">Programs</div>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{stats?.documentedPrograms || 0}</div>
              <div className="text-xs text-muted-foreground">Documented</div>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="text-center">
              <div className="text-lg font-bold text-warning">
                {(stats?.totalPrograms || 0) - (stats?.documentedPrograms || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>
        
        {/* Global Search */}
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-muted-foreground" size={18} />
            </div>
            <Input
              type="text"
              placeholder="Search programs, variables, documentation..."
              className="pl-12 h-12 bg-input/50 border-border/50 rounded-xl text-white placeholder:text-muted-foreground focus:bg-input focus:border-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(searchQuery);
                }
              }}
              data-testid="global-search"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-[hsl(var(--sidebar-hover))] text-white/70 hover:text-white"
            data-testid="notifications-button"
          >
            <Bell size={20} />
            <Badge 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-primary text-[hsl(var(--primary-foreground))] text-xs"
            >
              3
            </Badge>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="hover:bg-[hsl(var(--sidebar-hover))] text-white/70 hover:text-white"
            data-testid="help-button"
          >
            <HelpCircle size={20} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="hover:bg-[hsl(var(--sidebar-hover))] text-white/70 hover:text-white"
            data-testid="settings-button"
          >
            <Settings size={20} />
          </Button>
          
          <div className="w-px h-8 bg-border"></div>
          
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-[hsl(var(--primary-foreground))] font-semibold">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
