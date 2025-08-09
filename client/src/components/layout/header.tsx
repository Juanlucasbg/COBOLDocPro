import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    if (query.trim()) {
      console.log("Searching for:", query);
    }
  };

  return (
    <header className="ultra-minimal">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 h-9 bg-black text-white text-sm placeholder-white w-full"
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

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          <button className="ultra-minimal-button h-8 px-3 text-xs">
            Dashboard
          </button>
          <button className="ultra-minimal-button h-8 px-3 text-xs">
            Community
          </button>
          <button className="ultra-minimal-button h-8 px-3 text-xs">
            View Codebase
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white"></div>
            <span className="text-xs text-white">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}