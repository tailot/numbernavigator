<p align="center">
  <img src="src/assets/icons/icon128.png" alt="NumberNavigator Logo" width="128">
</p>

# NumberNavigator

NumberNavigator is a browser extension designed for hands-free navigation of web pages using voice commands. It allows users to interact with web elements and scroll pages by speaking numbers.

## Core Features

*   **Voice-controlled clicking:** say the number shown next to any visible link, button, checkbox, menu, tab or field.
*   **Text fields:** saying a field's number puts the cursor in it, ready to type or dictate.
*   **Voice-controlled scrolling:** say "zero" to scroll down and "one" to scroll up (works on pages that scroll inside a container too).
*   **Stable numbers:** an element keeps its number while it is on screen; numbers refresh automatically after scrolling, resizing or page changes.
*   **Clear feedback:** a toast on the page confirms every command ("Clicked 12"), and the control tab shows what was heard.
*   **Multi-language:** English, Spanish, Italian, French, German, Arabic and Japanese. Digits ("21") and words ("twenty-one") are both understood. The language is remembered.
*   **Non-intrusive:** labels are drawn in an overlay; the page's own layout and styles are not modified.

## How to Use

1.  **Install** (same package for both browsers; unzip it first, or use `dist/numbernavigator/browser` after building):
    *   **Google Chrome:** open `chrome://extensions` -> enable *Developer mode* -> *Load unpacked* -> select the folder.
    *   **Microsoft Edge:** open `edge://extensions` -> enable *Developer mode* (left sidebar) -> *Load unpacked* -> select the folder.
2.  Click the toolbar icon: the **control tab** opens. Press **Start** and allow the microphone.
3.  Switch to the website you want to control. **Keep the control tab open** (it can stay in the background).
4.  Say the yellow number next to what you want to click. Say **0** to scroll down, **1** to scroll up.
5.  Press **Stop** (in the control tab) to remove the numbers and turn the microphone off.

**Notes**

*   Speech recognition uses the browser's online service, so an internet connection is required.
*   Works on `http`/`https` pages only (not `chrome://` / `edge://` pages, the Chrome Web Store, Edge Add-ons or local files).
*   Supported browsers: Google Chrome and Microsoft Edge (version 105 or later). Internet Explorer is not supported.
*   On Edge/Windows, if the microphone starts but nothing is recognized, check *Settings -> Privacy -> Speech -> Online speech recognition*.
*   Numbers 2-200 are assigned, in page order, to elements currently visible in the window.
*   Numbers are never assigned to elements hidden behind other content (modals, sticky bars).

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
    (`npm ci` also works: the unused `@angular-builders/custom-webpack` dependency that blocked it was removed.)

3.  **Build the extension:**
    ```bash
    npm run build
    ```
    This compiles the Angular app and, via `tsconfig.scripts.json`, the content and background scripts (works on Windows, macOS and Linux).

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
