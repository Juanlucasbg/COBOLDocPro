function setActivePrompt(promptKey) {
    console.log(`Setting prompt ${promptKey} as active`);
    
    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    console.log("CSRF token loaded:", csrfToken ? "Present" : "Missing");
    
    fetch('/api/prompts/set-active', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || '' // Add CSRF token to headers
        },
        body: JSON.stringify({
            prompt_key: promptKey
        }),
    })
    .then(response => {
        if (!response.ok) {
            console.error(`HTTP error ${response.status}: ${response.statusText}`);
            // Try to parse JSON response, but handle non-JSON responses gracefully
            return response.text().then(text => {
                try {
                    // Try to parse as JSON first
                    const data = JSON.parse(text);
                    throw new Error(data.message || `Server returned ${response.status}`);
                } catch (e) {
                    // If parsing fails, use the text as error message
                    throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}...`);
                }
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success toast
            showToast(`Set prompt "${promptKey}" as active`, 'success');
            
            // Update the UI to reflect the active prompt
            updateActivePromptIndicators(promptKey);
        } else {
            showToast(data.message || 'Error setting active prompt', 'danger');
        }
    })
    .catch(error => {
        console.error('Error setting active prompt:', error);
        showToast(`Error setting active prompt: ${error.message || 'Unknown error'}`, 'danger');
    });
}