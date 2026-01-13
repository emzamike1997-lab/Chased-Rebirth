# Gold Standard for Completion

## Verification Protocol
For every sub-task performed in this repository, the following constraints must be met before reporting completion:

1.  **Live Validation**: If the task affects the UI, you must use the Browser Agent to visit the live URL.
    - You must physically interact with the feature (buttons, forms, etc.).
2.  **Visual Proof**: You must generate a Screenshot Artifact or Video Recording of the successful action.
3.  **Fresh Deployment Check**:
    - Copy the Deployment Timestamp and Deployment ID from the terminal output.
    - Verify it matches the current time.
4.  **Console/Log Audit**: Check Browser Console/Server Logs for new errors and provide a snippet.

## Reporting Structure
Do not provide a summary until this checklist is filled:
- **Action Taken**: [Brief description]
- **Verification Method**: [How it was tested live]
- **Proof Attached**: [Link to Artifact]
- **Deployment Time**: [Exact timestamp]
