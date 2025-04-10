import { useState, useEffect } from "react";
import YAML from "yaml";
import { InputType, ConversionResult, DBType, TagType, SQLOptions } from "../lib/types";
import { convertToGo, formatJSON, formatYAML, TEMPLATES, validateFormat } from "../lib/utils";

export default function Home() {
  const [input, setInput] = useState("");
  const [formattedInput, setFormattedInput] = useState("");
  const [type, setType] = useState<InputType>("json");
  const [result, setResult] = useState<ConversionResult>({ success: true, output: "" });
  const [sqlOptions, setSqlOptions] = useState<SQLOptions>({
    dbType: "mysql",
    tagType: "gorm",
    usePointer: true,
  });

  useEffect(() => {
    if (!input.trim()) {
      setFormattedInput("");
      return;
    }

    try {
      if (type === "json") {
        setFormattedInput(formatJSON(input));
      } else if (type === "yaml") {
        setFormattedInput(formatYAML(input));
      } else {
        setFormattedInput(input);
      }
    } catch {
      setFormattedInput(input);
    }
  }, [input, type]);

  const handleConvert = () => {
    try {
      // 首先进行格式校验
      const validation = validateFormat(input, type);
      if (!validation.isValid) {
        setResult({
          success: false,
          output: `// ❌ ${validation.error}`,
          error: { message: validation.error || "格式错误" }
        });
        return;
      }

      const struct = convertToGo(input, type, type === 'sql' ? sqlOptions : undefined);
      setResult({ success: true, output: struct });
    } catch (e) {
      setResult({
        success: false,
        output: "// ❌ 解析错误：" + (e instanceof Error ? e.message : "未知错误"),
        error: { message: e instanceof Error ? e.message : "未知错误" }
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setInput(content);
      }
    };
    reader.onerror = () => {
      setResult({
        success: false,
        output: "// ❌ 文件读取失败！",
        error: { message: "文件读取失败" }
      });
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!result.success || !result.output) {
      alert("没有可导出的内容！");
      return;
    }
    const blob = new Blob([result.output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "struct.go";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFormat = () => {
    setInput(formattedInput);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 font-mono">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <img src="/gopher.png" alt="Go Gopher" className="w-10 h-10" />
        <div className="flex flex-col">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-green-500">
            Go Struct
          </span>
          <span className="text-base font-normal text-gray-600">
            在线数据结构转换工具
          </span>
        </div>
      </h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { type: "json", icon: "🔄" },
          { type: "yaml", icon: "📝" },
          { type: "sql", icon: "💾" },
          { type: "proto", icon: "📦" },
          { type: "xml", icon: "🌐" },
          { type: "csv", icon: "📊" }
        ].map(({ type: t, icon }) => (
          <button
            key={t}
            className={"px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 " +
              (t === type
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white border hover:border-blue-400")
            }
            onClick={() => setType(t as InputType)}
          >
            <span className="text-xl">{icon}</span>
            <span>{t.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {type === "sql" && (
        <div className="mb-6 grid grid-cols-3 gap-6">
          <div>
            <label className="block mb-2 text-sm text-gray-600">数据库类型:</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={sqlOptions.dbType}
              onChange={(e) => setSqlOptions({ ...sqlOptions, dbType: e.target.value as DBType })}
            >
              <option value="mysql">MySQL</option>
              <option value="postgres">PostgreSQL</option>
              <option value="sqlite">SQLite</option>
              <option value="oracle">Oracle</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm text-gray-600">标签类型:</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={sqlOptions.tagType}
              onChange={(e) => setSqlOptions({ ...sqlOptions, tagType: e.target.value as TagType })}
            >
              <option value="db">database/sql</option>
              <option value="gorm">GORM</option>
              <option value="xorm">XORM</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm text-gray-600">字段类型:</label>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                className="mr-2"
                checked={sqlOptions.usePointer}
                onChange={(e) => setSqlOptions({ ...sqlOptions, usePointer: e.target.checked })}
              />
              <span className="text-sm text-gray-600">使用指针类型</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block mb-2 text-sm text-gray-600">
          选择文件（可选）:
          <input
            type="file"
            accept=".json,.yaml,.yml,.sql,.txt"
            onChange={handleFileUpload}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-600">输入:</label>
            {(type === "json" || type === "yaml") && (
              <button
                onClick={handleFormat}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                格式化
              </button>
            )}
            <button
              onClick={() => setInput(TEMPLATES[type])}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              加载示例
            </button>
          </div>
          <textarea
            rows={15}
            className="w-full p-4 border rounded-lg font-mono text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            placeholder={"请输入" + type.toUpperCase() + "内容..."}
            value={input}
            onChange={handleInputChange}
          />
          {/* {(type === "json" || type === "yaml") && formattedInput !== input && (
            <div className="mt-2">
              <p className="text-sm text-gray-500">预览格式化结果:</p>
              <pre className="mt-1 p-4 bg-gray-50 rounded-lg text-sm overflow-auto max-h-[200px]">
                {formattedInput}
              </pre>
            </div>
          )} */}
        </div>

        <div>
          <label className="block mb-2 text-sm text-gray-600">输出:</label>
          <pre className={"p-4 rounded-lg font-mono text-sm h-[360px] overflow-auto shadow-sm " +
            (result.success ? "bg-white" : "bg-red-50")
          }>
            {result.output || "// 转换后的Go结构体将显示在这里..."}
          </pre>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center gap-2 shadow-sm"
          onClick={handleConvert}
        >
          🚀 转换
        </button>
        <button
          className={"px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm " +
            (result.success
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed")
          }
          onClick={handleDownload}
          disabled={!result.success}
        >
          ⬇️ 导出
        </button>
      </div>
    </div>
  );
} 