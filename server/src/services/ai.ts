import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function generatePRSummary(tool: string, diff: string, mode?: string): Promise<{ title: string; body: string }> {
    if (!tool) throw new Error("AI tool not configured");

    const prompt = `
Analyze the following git diff and generate a concise Pull Request title and a detailed description.
The description should summarize the changes and their impact.

Format your response EXACTLY like this:
TITLE: <concise title>
BODY:
<detailed description>

DIFF:
${diff}
`;

    try {
        // We use the same tool detection logic or path as the terminal
        // For simplicity, we assume the tool is in the PATH or we use the 'which' result if available
        // Here we just call the tool with the prompt as an argument.
        // NOTE: Some tools might expect prompt from stdin. For now, we try passing as argument.
        // If it fails, we might need to pipe to stdin.
        
        // Build command with mode flag if specified
        let command = tool;
        if (mode) {
            // Add the mode as a flag (e.g., --mode plan or --plan-mode)
            // Different AI tools may have different syntax, we'll use a common pattern
            command = `${tool} --mode ${mode}`;
        }
        
        const { stdout, stderr } = await execAsync(`${command} ${JSON.stringify(prompt)}`);

        if (stderr && !stdout) {
            console.error(`AI tool error: ${stderr}`);
        }

        const output = stdout.trim();
        const titleMatch = output.match(/^TITLE:\s*(.+)$/m);
        const bodyMatch = output.match(/^BODY:\s*([\s\S]+)$/m);

        return {
            title: titleMatch ? titleMatch[1].trim() : "Updated PR",
            body: bodyMatch ? bodyMatch[1].trim() : output
        };
    } catch (e: any) {
        console.error(`Failed to generate PR summary with ${tool}:`, e);
        throw new Error(`AI generation failed: ${e.message}`);
    }
}
