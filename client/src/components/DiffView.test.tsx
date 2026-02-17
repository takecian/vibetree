import { render, screen, fireEvent } from '@testing-library/react';
import { DiffView } from './DiffView';
import { describe, it, expect } from 'vitest';

const sampleDiff = `diff --git a/client/src/components/TaskDetail.tsx b/client/src/components/TaskDetail.tsx
index 1234567..abcdefg 100644
--- a/client/src/components/TaskDetail.tsx
+++ b/client/src/components/TaskDetail.tsx
@@ -1,5 +1,6 @@
 import { useState, useEffect } from 'react';
 import { useTranslation } from 'react-i18next';
+import { DiffView } from './DiffView';
 import { useNavigate } from 'react-router-dom';
 import { useTasks } from '../context/TaskContext';
 
@@ -327,10 +328,7 @@
-                        <div className="bg-slate-950 p-4 rounded-lg">
-                            <pre className="text-slate-300">
-                                {diffData?.diff || t('taskDetail.diffEmpty')}
-                            </pre>
-                        </div>
+                        <DiffView diffText={diffData?.diff || ''} />
                     )}
                 </div>`;

describe('DiffView', () => {
    it('should render empty state when no diff provided', () => {
        render(<DiffView diffText="" />);
        expect(screen.getByText('No changes to display')).toBeInTheDocument();
    });

    it('should parse and render diff with files', () => {
        render(<DiffView diffText={sampleDiff} />);
        // The file path should be rendered
        expect(screen.getByText(/TaskDetail.tsx/)).toBeInTheDocument();
    });

    it('should show addition and deletion counts', () => {
        render(<DiffView diffText={sampleDiff} />);
        // Should show stats for additions and deletions
        expect(screen.getByText('+2')).toBeInTheDocument();
        expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should allow collapsing and expanding files', () => {
        render(<DiffView diffText={sampleDiff} />);
        
        // Initially expanded, should show the Diff component
        const diffWrapper = document.querySelector('.diff-view-wrapper');
        expect(diffWrapper).toBeInTheDocument();
        
        // Click to collapse
        const fileHeader = screen.getByText(/TaskDetail.tsx/).closest('div');
        if (fileHeader) {
            fireEvent.click(fileHeader);
        }
        
        // After collapse, diff content should be hidden
        const collapsedDiffWrapper = document.querySelector('.diff-view-wrapper');
        expect(collapsedDiffWrapper).not.toBeInTheDocument();
    });
});
