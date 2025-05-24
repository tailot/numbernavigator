# NumberNavigator

NumberNavigator is a browser extension designed for hands-free navigation of web pages using voice commands. It allows users to interact with web elements and scroll pages by speaking numbers.

## Core Features

*   **Voice-Controlled Element Interaction:** Click on any detected clickable element on a webpage by saying its corresponding number.
*   **Voice-Controlled Scrolling:** Scroll pages up or down using simple voice commands (e.g., "zero" for down, "one" for up).
*   **Multi-Language Support:** Recognizes numbers spoken in various languages, including English, Spanish, Italian, French, German, Arabic, and Japanese.
*   **Visual Numbering:** Overlays numbers on clickable elements for easy identification and interaction.
*   **User-Friendly Interface:** Simple popup menu to control language settings, activate numbering, and start/stop voice recognition.
*   **Cross-Platform:** Built as a standard browser extension, primarily for Chrome and Chromium-based browsers.

## How to Use

1.  **Installation (for Chrome/Chromium-based browsers):**
    *   Download the latest release or clone this repository.
    *   If you have a packaged version (`.zip`), unzip it to a dedicated folder.
    *   Open your browser and navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle in the top right corner).
    *   Click on "Load unpacked".
    *   Select the directory where you unzipped the extension files (or the `dist/numbernavigator/browser` directory if you built from source).

2.  **Using the Extension:**
    *   Once installed, you should see the NumberNavigator icon (a stylized number) in your browser's toolbar. Click it to open the extension popup.
    *   **Activate Numbering:** In the popup, click the "Toggle Numbering" button. This will scan the current web page and display numbers next to clickable elements. The button will change to "Deactivate Numbering".
    *   **Voice Commands:**
        *   Click the "Start Listening" button in the popup.
        *   **To click an element:** Clearly say the number displayed next to the element you wish to interact with (e.g., "two", "fifteen").
        *   **To scroll down:** Say "zero".
        *   **To scroll up:** Say "one".
        *   The extension will attempt to perform the action. Recognized speech and numbers will briefly appear in the popup.
    *   **Change Language:** Select your preferred language from the dropdown menu in the popup. Recognition will adapt to the chosen language. If you change the language while listening is active, it will stop and you'll need to click "Start Listening" again.
    *   **Stop Listening:** Click the "Stop Listening" button in the popup to deactivate voice recognition.
    *   **Deactivate Numbering:** Click the "Deactivate Numbering" button (if active) to remove the number overlays from the page. This also stops listening if it's active.

**Important Notes:**

*   The extension requires microphone permission. Your browser will likely prompt you for this the first time you try to use the voice recognition feature.
*   Speech recognition accuracy can vary based on microphone quality, background noise, and pronunciation.
*   Numbering works best on pages with clearly defined clickable elements (buttons, links, etc.).
*   The content script that enables numbering and interaction is injected into `http` and `https` pages. It won't work on browser-internal pages (like `chrome://extensions`) or local files (`file:///...`) by default.

## Building from Source

To build NumberNavigator from the source code, you'll need Node.js and npm (which comes with Node.js) installed.

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd numbernavigator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the extension:**
    ```bash
    npm run build
    ```
    This command compiles the Angular application, TypeScript content scripts, and background scripts.

4.  **Locate the built extension:**
    The production-ready build of the extension will be available in the `dist/numbernavigator/browser` directory.

5.  **Load the unpacked extension:**
    Follow the installation instructions in the "How to Use" section, using the `dist/numbernavigator/browser` directory.

## Contributing

Contributions are welcome! If you have ideas for improvements, new features, or bug fixes, please feel free to:

1.  Fork the repository.
2.  Create a new branch for your feature or fix.
3.  Make your changes.
4.  Submit a pull request.

If you encounter any issues or have suggestions, please open an issue on the project's issue tracker.
