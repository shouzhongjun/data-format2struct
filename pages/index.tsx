import { useState, useEffect } from "react";
import { InputType, ConversionResult, DBType, TagType, SQLOptions } from "@/lib/types";
import { convertToGo, formatJSON, formatYAML, TEMPLATES, validateFormat } from "@/lib/utils";

export default function Home() {
  const [input, setInput] = useState("");
  const [formattedInput, setFormattedInput] = useState("");
  const [type, setType] = useState<InputType>("json");
  const [result, setResult] = useState<ConversionResult>({ success: true, output: "" });
  const [isCopied, setIsCopied] = useState(false);
  const [sqlOptions, setSqlOptions] = useState<SQLOptions>({
    dbType: "mysql",
    tagType: "gorm",
    usePointer: true,
  });
  const currentYear = new Date().getFullYear();

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

  const handleCopy = async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 font-mono">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <img 
          src="/gopher.png" 
          alt="Go Gopher" 
          className="w-12 h-12 object-cover rounded-lg"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="flex flex-col">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-green-500">
            Go Struct
          </span>
          <span className="text-base font-normal text-gray-600">
            在线数据结构转换工具
          </span>
        </div>
      </h1>

      <div className="flex gap-4 mb-6 flex-wrap items-center justify-between">
        <div className="flex gap-4 flex-wrap">
          {[
            { type: "json", icon: "/json.svg" },
            { type: "yaml", icon: "/yaml.svg" },
            { type: "sql", icon: "/sql.svg" },
            { type: "proto", icon: "/proto.svg" },
            { type: "xml", icon: "/xml.svg" },
            { type: "csv", icon: "/csv.svg" }
          ].map(({ type: t, icon }) => (
            <button
              key={t}
              className={"px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 " +
                (t === type
                  ? "bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg"
                  : "bg-white border hover:border-blue-400")
              }
              onClick={() => setType(t as InputType)}
            >
              {icon.startsWith('/') ? (
                <img src={icon} alt={t} className="w-5 h-5" />
              ) : (
                <span className="text-lg">{icon}</span>
              )}
              <span className="text-sm">{t.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            className="px-6 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-lg hover:from-violet-600 hover:to-violet-700 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 active:shadow-inner transform will-change-transform"
            onClick={handleConvert}
          >
            <img src="/convert.svg" alt="转换" className="w-5 h-5 transition-transform duration-500 group-active:rotate-180 will-change-transform" />
            <span>转换</span>
          </button>
          <button
            className={"px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md transform will-change-transform " +
              (result.success
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 active:scale-95 active:shadow-inner"
                : "bg-gray-300 text-gray-500 cursor-not-allowed")
            }
            onClick={handleDownload}
            disabled={!result.success}
          >
            <img src="/export.svg" alt="导出" className="w-5 h-5 transition-transform duration-200 active:translate-y-0.5 will-change-transform" />
            <span>导出</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col">
          <div className="h-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="text-xs text-gray-500">输入:</label>
              <input
                type="file"
                accept=".json,.yaml,.yml,.sql,.txt"
                onChange={handleFileUpload}
                className="text-xs text-gray-500 
                  file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 
                  file:text-xs file:font-medium file:bg-gradient-to-r file:from-blue-500 
                  file:to-green-500 file:text-white hover:file:from-blue-600 
                  hover:file:to-green-600 file:transition-all file:duration-200 
                  file:shadow-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              {type === "sql" && (
                <>
                  <select
                    className="px-2 py-1 border rounded-lg text-xs bg-white"
                    value={sqlOptions.dbType}
                    onChange={(e) => setSqlOptions({ ...sqlOptions, dbType: e.target.value as DBType })}
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="oracle">Oracle</option>
                  </select>
                  <select
                    className="px-2 py-1 border rounded-lg text-xs bg-white"
                    value={sqlOptions.tagType}
                    onChange={(e) => setSqlOptions({ ...sqlOptions, tagType: e.target.value as TagType })}
                  >
                    <option value="db">database/sql</option>
                    <option value="gorm">GORM</option>
                    <option value="xorm">XORM</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="w-3 h-3"
                      checked={sqlOptions.usePointer}
                      onChange={(e) => setSqlOptions({ ...sqlOptions, usePointer: e.target.checked })}
                    />
                    <span className="text-xs text-gray-500">指针</span>
                  </div>
                </>
              )}
              {(type === "json" || type === "yaml") && (
                <button
                  onClick={handleFormat}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  格式化
                </button>
              )}
              <button
                onClick={() => setInput(TEMPLATES[type])}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                加载示例
              </button>
            </div>
          </div>
          <div className="flex-1 relative bg-white rounded-lg shadow-sm min-h-[500px]">
            <textarea
              className="w-full h-full p-4 font-mono text-sm resize-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-opacity-50"
              placeholder={"请输入" + type.toUpperCase() + "内容..."}
              value={input}
              onChange={handleInputChange}
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)'
              }}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="h-8 flex items-center justify-between">
            <label className="text-xs text-gray-500">输出:</label>
            {result.output && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
              >
                <img 
                  src={isCopied ? "/check.svg" : "/copy.svg"} 
                  alt={isCopied ? "已复制" : "复制"} 
                  className="w-4 h-4"
                />
                <span>{isCopied ? "已复制" : "复制"}</span>
              </button>
            )}
          </div>
          <div className="flex-1 relative bg-white rounded-lg shadow-sm min-h-[500px]">
            <pre 
              className={"w-full h-full p-4 font-mono text-sm overflow-auto rounded-lg " +
                (result.success ? "bg-gray-50" : "bg-red-50")
              }
              style={{ 
                backgroundColor: result.success ? 'rgba(249, 250, 251, 0.8)' : 'rgba(254, 242, 242, 0.8)',
                backdropFilter: 'blur(4px)'
              }}
            >
              {result.output || "// 转换后的Go结构体将显示在这里..."}
            </pre>
          </div>
        </div>
      </div>
      
      {/* 版权信息 */}
      <div className="mt-5 text-center text-sm text-gray-500">
        © {currentYear} JSON-to-Go. Built with ♥ by <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Vercel</a>
      </div>
    </div>
  );
} 