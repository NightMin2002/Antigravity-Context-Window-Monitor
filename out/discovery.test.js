"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const discovery_1 = require("./discovery");
(0, vitest_1.describe)('discovery.ts', () => {
    (0, vitest_1.describe)('buildExpectedWorkspaceId', () => {
        (0, vitest_1.it)('should handle standard Posix workspace URIs', () => {
            // Mirrors: id = workspaceUri.replace(':///', '_'); id = id.replace(/\//g, '_');
            const uri = 'file:///Users/foo/bar';
            const expected = 'file_Users_foo_bar';
            (0, vitest_1.expect)((0, discovery_1.buildExpectedWorkspaceId)(uri)).toBe(expected);
        });
        (0, vitest_1.it)('should replace hyphens with underscores on all platforms', () => {
            // The LS converts hyphens to underscores in --workspace_id on ALL platforms
            const uri = 'file:///Users/foo/my-project';
            const expected = 'file_Users_foo_my_project';
            (0, vitest_1.expect)((0, discovery_1.buildExpectedWorkspaceId)(uri)).toBe(expected);
        });
        if (process.platform === 'win32') {
            (0, vitest_1.it)('should handle Windows workspace URIs with colon encoding', () => {
                const uri = 'file:///c:/Users/8bit/project';
                // Step 1: file_c:/Users/8bit/project
                // Step 2: file_c_3A_/Users/8bit/project
                // Step 3: file_c_3A__Users_8bit_project
                // Step 4 (regex /__+/): file_c_3A_Users_8bit_project
                const result = (0, discovery_1.buildExpectedWorkspaceId)(uri);
                (0, vitest_1.expect)(result).toBe('file_c_3A_Users_8bit_project');
            });
            (0, vitest_1.it)('should handle hyphens on Windows', () => {
                const uri = 'file:///c:/my-project';
                const result = (0, discovery_1.buildExpectedWorkspaceId)(uri);
                (0, vitest_1.expect)(result).toBe('file_c_3A_my_project');
            });
            (0, vitest_1.it)('should decode percent-encoded Windows drive letters before building workspace id', () => {
                const uri = 'file:///c%3A/Users/foo/my-project';
                const result = (0, discovery_1.buildExpectedWorkspaceId)(uri);
                (0, vitest_1.expect)(result).toBe('file_c_3A_Users_foo_my_project');
            });
        }
    });
    (0, vitest_1.describe)('extractPid', () => {
        (0, vitest_1.it)('should extract PID from a ps-style line', () => {
            const line = '  12345 language_server_macos --csrf_token abc';
            (0, vitest_1.expect)((0, discovery_1.extractPid)(line)).toBe(12345);
        });
        (0, vitest_1.it)('should return null for invalid lines', () => {
            (0, vitest_1.expect)((0, discovery_1.extractPid)('invalid line')).toBe(null);
        });
    });
    (0, vitest_1.describe)('extractCsrfToken', () => {
        (0, vitest_1.it)('should extract CSRF token from command line', () => {
            const line = 'ls --csrf_token token123 --workspace_id ws1';
            (0, vitest_1.expect)((0, discovery_1.extractCsrfToken)(line)).toBe('token123');
        });
    });
    (0, vitest_1.describe)('extractWorkspaceId', () => {
        (0, vitest_1.it)('should extract workspace ID from command line', () => {
            const line = 'ls --csrf_token t1 --workspace_id file_c_3A_tmp';
            (0, vitest_1.expect)((0, discovery_1.extractWorkspaceId)(line)).toBe('file_c_3A_tmp');
        });
    });
    (0, vitest_1.describe)('filterLsProcessLines', () => {
        (0, vitest_1.it)('should filter correct process lines based on platform', () => {
            const binary = process.platform === 'win32' ? 'language_server_windows' : 'language_server_macos';
            const lines = [
                `100 ${binary} --antigravity --csrf_token x`,
                `101 some_other_proc`,
                `102 ${binary} --other --antigravity`
            ].join('\n');
            const filtered = (0, discovery_1.filterLsProcessLines)(lines);
            (0, vitest_1.expect)(filtered).toHaveLength(2);
            (0, vitest_1.expect)(filtered[0]).toContain('100');
        });
    });
    (0, vitest_1.describe)('selectMatchingProcessLine', () => {
        function workspaceUriForCurrentPlatform(name) {
            return process.platform === 'win32'
                ? `file:///c:/Users/foo/${name}`
                : `file:///Users/foo/${name}`;
        }
        function makeLine(workspaceId) {
            const suffix = workspaceId ? ` --workspace_id ${workspaceId}` : '';
            return `language_server_windows --csrf_token token${suffix}`;
        }
        (0, vitest_1.it)('falls back to the first line when workspaceUri is missing', () => {
            const lines = [makeLine('ws_a'), makeLine('ws_b')];
            (0, vitest_1.expect)((0, discovery_1.selectMatchingProcessLine)(lines)).toBe(lines[0]);
        });
        (0, vitest_1.it)('returns the exact workspace match when one exists', () => {
            const workspaceUri = workspaceUriForCurrentPlatform('project-b');
            const expected = (0, discovery_1.buildExpectedWorkspaceId)(workspaceUri);
            const lines = [makeLine('other_workspace'), makeLine(expected)];
            (0, vitest_1.expect)((0, discovery_1.selectMatchingProcessLine)(lines, workspaceUri)).toBe(lines[1]);
        });
        (0, vitest_1.it)('returns null when workspaceUri exists but no line matches', () => {
            const workspaceUri = workspaceUriForCurrentPlatform('project-c');
            const lines = [makeLine('different_workspace')];
            (0, vitest_1.expect)((0, discovery_1.selectMatchingProcessLine)(lines, workspaceUri)).toBe(null);
        });
        (0, vitest_1.it)('returns null when lines do not include a workspace_id flag', () => {
            const workspaceUri = workspaceUriForCurrentPlatform('project-d');
            const lines = [makeLine()];
            (0, vitest_1.expect)((0, discovery_1.selectMatchingProcessLine)(lines, workspaceUri)).toBe(null);
        });
        (0, vitest_1.it)('returns null for empty input', () => {
            (0, vitest_1.expect)((0, discovery_1.selectMatchingProcessLine)([], workspaceUriForCurrentPlatform('project-e'))).toBe(null);
        });
        (0, vitest_1.it)('still finds the exact match among mixed lines', () => {
            const workspaceUri = workspaceUriForCurrentPlatform('project-f');
            const expected = (0, discovery_1.buildExpectedWorkspaceId)(workspaceUri);
            const lines = [makeLine(), makeLine('unrelated_workspace'), makeLine(expected)];
            (0, vitest_1.expect)((0, discovery_1.selectMatchingProcessLine)(lines, workspaceUri)).toBe(lines[2]);
        });
    });
    (0, vitest_1.describe)('port extraction', () => {
        (0, vitest_1.it)('extractPort should handle lsof format', () => {
            const line = 'procnm 123 user 4u IPv4 0x... 0t0 TCP 127.0.0.1:54321 (LISTEN)';
            (0, vitest_1.expect)((0, discovery_1.extractPort)(line)).toBe(54321);
        });
        (0, vitest_1.it)('extractPortFromNetstat should handle Windows netstat format', () => {
            const line = '  TCP    127.0.0.1:65432    0.0.0.0:0              LISTENING       1234';
            (0, vitest_1.expect)((0, discovery_1.extractPortFromNetstat)(line)).toBe(65432);
        });
        (0, vitest_1.it)('extractPortFromSs should handle ss format with 127.0.0.1', () => {
            const line = 'LISTEN  0  128  127.0.0.1:54321  0.0.0.0:*  users:(("language_server_linux",pid=1234,fd=5))';
            (0, vitest_1.expect)((0, discovery_1.extractPortFromSs)(line)).toBe(54321);
        });
        (0, vitest_1.it)('extractPortFromSs should handle ss format with wildcard', () => {
            const line = 'LISTEN  0  128  *:8080  *:*  users:(("node",pid=5678,fd=9))';
            (0, vitest_1.expect)((0, discovery_1.extractPortFromSs)(line)).toBe(8080);
        });
    });
    (0, vitest_1.describe)('isWSL', () => {
        (0, vitest_1.it)('should return a boolean', () => {
            // On Windows test runner, isWSL() returns false (no /proc/version)
            // On actual WSL, it would return true
            (0, vitest_1.expect)(typeof (0, discovery_1.isWSL)()).toBe('boolean');
        });
        if (process.platform === 'win32') {
            (0, vitest_1.it)('should return false on native Windows', () => {
                (0, vitest_1.expect)((0, discovery_1.isWSL)()).toBe(false);
            });
        }
    });
});
//# sourceMappingURL=discovery.test.js.map