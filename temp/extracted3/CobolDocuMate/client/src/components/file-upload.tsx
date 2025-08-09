import { useState } from "react";
import { CloudUpload, Upload } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onUploadStart: () => void;
  onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadStart, onUploadSuccess }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  
  const { uploadFiles, isUploading } = useFileUpload({
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "Your COBOL files have been uploaded and are being processed.",
      });
      onUploadSuccess();
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return ['.cob', '.cbl', '.txt'].includes(extension);
    });

    if (validFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please upload only .cob, .cbl, or .txt files.",
        variant: "destructive",
      });
      return;
    }

    if (validFiles.length !== files.length) {
      toast({
        title: "Some Files Skipped",
        description: "Only .cob, .cbl, and .txt files were uploaded.",
      });
    }

    onUploadStart();
    uploadFiles(validFiles);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium mb-4 text-carbon-gray-100">Upload COBOL Files</h2>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-carbon-blue bg-blue-50'
            : 'border-carbon-gray-30 hover:border-carbon-blue'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-carbon-gray-20 rounded-lg flex items-center justify-center">
            <CloudUpload className="text-carbon-gray-50 text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-carbon-gray-100">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-carbon-gray-80 mt-1">
              .cob, .cbl, .txt files only
            </p>
          </div>
        </div>
        <input
          id="file-input"
          type="file"
          className="hidden"
          multiple
          accept=".cob,.cbl,.txt"
          onChange={handleChange}
        />
      </div>

      {/* Upload Button */}
      <Button
        className="w-full mt-4 bg-carbon-blue text-white hover:bg-blue-600"
        disabled={isUploading}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? 'Processing...' : 'Upload & Process'}
      </Button>
    </div>
  );
}
