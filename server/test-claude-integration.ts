// Test file to debug Claude integration issues
import { generateClaudeProgramSummary } from './coco-llm';

async function testClaudeIntegration() {
  try {
    console.log('Testing Claude program summary generation...');
    
    const result = await generateClaudeProgramSummary(
      'TEST-PROGRAM',
      'IDENTIFICATION DIVISION, DATA DIVISION, PROCEDURE DIVISION',
      'IDENTIFICATION DIVISION. PROGRAM-ID. TEST-PROGRAM.'
    );
    
    console.log('Claude response:', JSON.stringify(result, null, 2));
    
    if (result && result.summary) {
      console.log('✓ Claude integration working correctly');
    } else {
      console.log('✗ Claude integration returning empty/invalid data');
    }
    
  } catch (error) {
    console.error('✗ Claude integration failed:', error);
  }
}

// Run test
testClaudeIntegration();

export { testClaudeIntegration };