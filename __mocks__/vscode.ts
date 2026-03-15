// Mock vscode module for unit tests.
// Provides minimal stubs so that imports resolve without the real VS Code runtime.

export class ThemeColor {
    constructor(public id: string) {}
}

export const StatusBarAlignment = {
    Left: 1,
    Right: 2,
};

export const QuickPickItemKind = {
    Separator: -1,
    Default: 0,
};

export class MarkdownString {
    value: string;
    supportThemeIcons: boolean = false;
    constructor(value?: string, _supportHtml?: boolean) {
        this.value = value || '';
    }
}

export const window = {
    createStatusBarItem: (_alignment?: number, _priority?: number) => ({
        text: '',
        tooltip: undefined as unknown,
        backgroundColor: undefined as unknown,
        command: '',
        name: '',
        show: () => {},
        hide: () => {},
        dispose: () => {},
    }),
    createOutputChannel: (_name: string) => ({
        appendLine: (_msg: string) => {},
        dispose: () => {},
    }),
    showQuickPick: async (_items: unknown[], _options?: unknown) => undefined,
    showInformationMessage: (_msg: string) => {},
};

export const workspace = {
    getConfiguration: (_section?: string) => ({
        get: <T>(_key: string, defaultValue?: T) => defaultValue,
    }),
    workspaceFolders: undefined,
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const commands = {
    registerCommand: (_command: string, _callback: (...args: unknown[]) => unknown) => ({
        dispose: () => {},
    }),
};

export default {
    ThemeColor,
    StatusBarAlignment,
    QuickPickItemKind,
    MarkdownString,
    window,
    workspace,
    commands,
};
