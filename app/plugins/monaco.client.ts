import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker?worker";

type MonacoEnvironment = {
  getWorker: (_workerId: string, label: string) => Worker;
};

export default defineNuxtPlugin(() => {
  (self as typeof self & { MonacoEnvironment: MonacoEnvironment }).MonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === "json") return new JsonWorker();
      if (["css", "scss", "less"].includes(label)) return new CssWorker();
      if (["html", "handlebars", "razor"].includes(label)) return new HtmlWorker();
      if (["typescript", "javascript"].includes(label)) return new TypeScriptWorker();
      return new EditorWorker();
    },
  };
});
