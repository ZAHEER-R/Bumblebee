export {};

type DesktopActionResult = {
  success: boolean;
  message: string;
};

type AgentResponse = {
  reply: string;
  tools: string[];
  model: string;
};

declare global {
  interface Window {
    ultron: {
      ping(): Promise<string>;

      chat(message: string): Promise<AgentResponse>;

      getModel(): Promise<string>;

      openApp(app: string): Promise<DesktopActionResult>;

      closeApp(app: string): Promise<DesktopActionResult>;

      typeInNotepad(text: string): Promise<DesktopActionResult>;

      setAlarm(time: string): Promise<DesktopActionResult>;

      openUserFolder(location: string): Promise<DesktopActionResult>;

      createUserFolder(location: string, name: string): Promise<DesktopActionResult>;

      searchMusic(provider: "spotify" | "youtube", query: string): Promise<DesktopActionResult>;

      calculate(expression: string): Promise<DesktopActionResult>;

      openWebsite(url: string): Promise<DesktopActionResult>;
    };
  }
}