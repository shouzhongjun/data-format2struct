import YAML from 'yaml';
import { SQLOptions, DBType } from './types';

interface GoType {
  type: string;
  isPointer: boolean;
  isArray: boolean;
  elementType?: GoType;
}

function inferGoType(value: any, seen = new Set<any>()): GoType {
  if (value === null || value === undefined) {
    return { type: "interface{}", isPointer: true, isArray: false };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: "interface{}", isPointer: false, isArray: true };
    }
    // 分析数组中的所有元素类型
    const elementTypes = value.map(item => inferGoType(item, seen));
    // 如果所有元素类型相同，使用该类型；否则使用 interface{}
    const isSameType = elementTypes.every(t => 
      t.type === elementTypes[0].type && 
      t.isPointer === elementTypes[0].isPointer
    );
    return {
      type: isSameType ? elementTypes[0].type : "interface{}",
      isPointer: isSameType ? elementTypes[0].isPointer : false,
      isArray: true,
      elementType: isSameType ? elementTypes[0] : undefined
    };
  }

  switch (typeof value) {
    case "string":
      return { type: "string", isPointer: false, isArray: false };
    case "number":
      if (Number.isInteger(value)) {
        if (value > 2147483647 || value < -2147483648) {
          return { type: "int64", isPointer: false, isArray: false };
        }
        return { type: "int", isPointer: false, isArray: false };
      }
      return { type: "float64", isPointer: false, isArray: false };
    case "boolean":
      return { type: "bool", isPointer: false, isArray: false };
    case "object":
      if (seen.has(value)) {
        return { type: "interface{}", isPointer: true, isArray: false };
      }
      seen.add(value);
      return { type: "struct", isPointer: false, isArray: false };
    default:
      return { type: "interface{}", isPointer: false, isArray: false };
  }
}

function formatGoFieldType(type: GoType): string {
  let result = "";
  if (type.isArray) {
    result += "[]";
  }
  if (type.isPointer) {
    result += "*";
  }
  result += type.type;
  return result;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function jsonToGo(obj: any, structName: string, seen = new Set<any>()): string {
  if (typeof obj !== "object" || obj === null) {
    return "";
  }

  if (seen.has(obj)) {
    return "";
  }
  seen.add(obj);

  const nestedStructs: string[] = [];
  let struct = "type " + structName + " struct {\n";

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = capitalizeFirst(key);
    const goType = inferGoType(value, new Set(seen));

    if (goType.type === "struct") {
      const nestedStructName = structName + fieldName;
      if (Array.isArray(value)) {
        const elementValue = value[0];
        if (elementValue && typeof elementValue === "object") {
          nestedStructs.push(jsonToGo(elementValue, nestedStructName, new Set(seen)));
          goType.type = nestedStructName;
        }
      } else {
        nestedStructs.push(jsonToGo(value, nestedStructName, new Set(seen)));
        goType.type = nestedStructName;
      }
    }

    struct += "\t" + fieldName + " " + formatGoFieldType(goType) + " `json:\"" + key + "\" yaml:\"" + key + "\"`\n";
  }

  struct += "}\n\n";
  return nestedStructs.join("") + struct;
}

export function formatJSON(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return input;
  }
}

export function formatYAML(input: string): string {
  try {
    const parsed = YAML.parse(input);
    return YAML.stringify(parsed, { indent: 2 });
  } catch {
    return input;
  }
}

const sqlTypeMap: Record<string, Record<DBType, string>> = {
  "int": {
    mysql: "int",
    postgres: "int",
    sqlite: "int",
    oracle: "int",
  },
  "bigint": {
    mysql: "int64",
    postgres: "int64",
    sqlite: "int64",
    oracle: "int64",
  },
  "tinyint": {
    mysql: "int8",
    postgres: "int8",
    sqlite: "int8",
    oracle: "int8",
  },
  "smallint": {
    mysql: "int16",
    postgres: "int16",
    sqlite: "int16",
    oracle: "int16",
  },
  "mediumint": {
    mysql: "int32",
    postgres: "int32",
    sqlite: "int32",
    oracle: "int32",
  },
  "float": {
    mysql: "float32",
    postgres: "float32",
    sqlite: "float32",
    oracle: "float32",
  },
  "double": {
    mysql: "float64",
    postgres: "float64",
    sqlite: "float64",
    oracle: "float64",
  },
  "decimal": {
    mysql: "float64",
    postgres: "decimal.Decimal",
    sqlite: "float64",
    oracle: "decimal.Decimal",
  },
  "number": {  // Oracle 特有类型
    mysql: "float64",
    postgres: "decimal.Decimal",
    sqlite: "float64",
    oracle: "decimal.Decimal",
  },
  "varchar": {
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "varchar2": {  // Oracle 特有类型
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "nvarchar2": {  // Oracle 特有类型
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "char": {
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "nchar": {  // Oracle 特有类型
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "text": {
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "clob": {  // Oracle 特有类型
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "nclob": {  // Oracle 特有类型
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "mediumtext": {
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "longtext": {
    mysql: "string",
    postgres: "string",
    sqlite: "string",
    oracle: "string",
  },
  "datetime": {
    mysql: "time.Time",
    postgres: "time.Time",
    sqlite: "time.Time",
    oracle: "time.Time",
  },
  "timestamp": {
    mysql: "time.Time",
    postgres: "time.Time",
    sqlite: "time.Time",
    oracle: "time.Time",
  },
  "date": {
    mysql: "time.Time",
    postgres: "time.Time",
    sqlite: "time.Time",
    oracle: "time.Time",
  },
  "time": {
    mysql: "time.Time",
    postgres: "time.Time",
    sqlite: "time.Time",
    oracle: "time.Time",
  },
  "boolean": {
    mysql: "bool",
    postgres: "bool",
    sqlite: "bool",
    oracle: "bool",
  },
  "bool": {
    mysql: "bool",
    postgres: "bool",
    sqlite: "bool",
    oracle: "bool",
  },
  "json": {
    mysql: "interface{}",
    postgres: "interface{}",
    sqlite: "interface{}",
    oracle: "interface{}",
  },
  "uuid": {
    mysql: "string",
    postgres: "uuid.UUID",
    sqlite: "string",
    oracle: "string",
  },
  "raw": {  // Oracle 特有类型
    mysql: "[]byte",
    postgres: "[]byte",
    sqlite: "[]byte",
    oracle: "[]byte",
  },
  "blob": {  // Oracle 特有类型
    mysql: "[]byte",
    postgres: "[]byte",
    sqlite: "[]byte",
    oracle: "[]byte",
  },
};

function generateTags(fieldName: string, options: SQLOptions): string {
  const tags: string[] = [];
  
  // 添加 json 和 yaml 标签
  tags.push(`json:"${fieldName.toLowerCase()}" yaml:"${fieldName.toLowerCase()}"`);
  
  // 根据选择的标签类型添加数据库标签
  switch (options.tagType) {
    case 'db':
      tags.push(`db:"${fieldName.toLowerCase()}"`);
      break;
    case 'gorm':
      tags.push(`gorm:"column:${fieldName.toLowerCase()}"`);
      break;
    case 'xorm':
      tags.push(`xorm:"'${fieldName.toLowerCase()}'"`);
      break;
  }
  
  return '`' + tags.join(' ') + '`';
}

export function sqlToGoStruct(sql: string, options: SQLOptions): string {
  const tableMatch = sql.match(/CREATE\s+TABLE\s+`?(\w+)`?\s*\(([\s\S]+)\)/i);
  if (!tableMatch) {
    throw new Error('Invalid SQL CREATE TABLE statement');
  }

  const [, tableName, columnsStr] = tableMatch;
  const structName = toPascalCase(tableName);
  const columns = columnsStr.split(',').map(col => col.trim());
  
  let structFields: string[] = [];
  let imports = new Set<string>();

  for (const column of columns) {
    const match = column.match(/`?(\w+)`?\s+([^()]+?)(?:\([^)]+\))?\s*(?:COMMENT\s+'[^']*')?(?:,|\s*$)/i);
    if (!match) continue;

    const [, fieldName, sqlType] = match;
    const goType = getGoType(sqlType.trim().toUpperCase(), options.dbType);
    
    if (goType.includes('time.Time')) {
      imports.add('time');
    }
    
    const fieldType = options.usePointer ? `*${goType}` : goType;
    const tags = generateTags(fieldName, options);
    structFields.push(`\t${toPascalCase(fieldName)} ${fieldType} ${tags}`);
  }

  let result = '';
  if (imports.size > 0) {
    result += 'import (\n';
    for (const imp of imports) {
      result += `\t"${imp}"\n`;
    }
    result += ')\n\n';
  }

  result += `type ${structName} struct {\n`;
  result += structFields.join('\n');
  result += '\n}';

  return result;
}

export const TEMPLATES = {
  json: `{
  "id": 1,
  "name": "example",
  "age": 25,
  "email": "test@example.com",
  "is_active": true,
  "created_at": "2024-03-21T12:00:00Z",
  "tags": ["tag1", "tag2"],
  "profile": {
    "address": "123 Street",
    "phone": "1234567890"
  }
}`,
  yaml: `id: 1
name: example
age: 25
email: test@example.com
is_active: true
created_at: 2024-03-21T12:00:00Z
tags:
  - tag1
  - tag2
profile:
  address: 123 Street
  phone: "1234567890"`,
  sql: `CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  age INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  is_active BOOLEAN DEFAULT true,
  profile_data JSON
)`,
  proto: `syntax = "proto3";

package example;

message User {
  int64 id = 1;
  string name = 2;
  int32 age = 3;
  string email = 4;
  bool is_active = 5;
  string created_at = 6;
  repeated string tags = 7;
  Profile profile = 8;
}

message Profile {
  string address = 1;
  string phone = 2;
}`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<user>
  <id>1</id>
  <name>example</name>
  <age>25</age>
  <email>test@example.com</email>
  <is_active>true</is_active>
  <created_at>2024-03-21T12:00:00Z</created_at>
  <tags>
    <tag>tag1</tag>
    <tag>tag2</tag>
  </tags>
  <profile>
    <address>123 Street</address>
    <phone>1234567890</phone>
  </profile>
</user>`,
  csv: `id,name,age,email,is_active,created_at
1,example,25,test@example.com,true,2024-03-21T12:00:00Z`
};

// Proto 转 Go 结构体
function protoToGo(proto: string): string {
  const lines = proto.split(/\r?\n/);
  let output = "";
  let currentMessage = "";
  let imports = new Set<string>();

  for (const line of lines) {
    // 忽略空行和 proto 语法声明
    if (!line.trim() || line.includes('syntax') || line.includes('package')) {
      continue;
    }

    // 处理消息定义
    if (line.includes('message')) {
      if (currentMessage) {
        output += "}\n\n";
      }
      const messageName = line.match(/message\s+(\w+)/)?.[1];
      if (messageName) {
        currentMessage = messageName;
        output += `type ${messageName} struct {\n`;
      }
      continue;
    }

    // 处理字段
    if (currentMessage && line.trim()) {
      const fieldMatch = line.match(/\s*(repeated)?\s*(\w+)\s+(\w+)\s*=\s*\d+;/);
      if (fieldMatch) {
        const [, repeated, type, name] = fieldMatch;
        const goType = protoTypeToGo(type);
        const fieldName = capitalizeFirst(name);
        const fieldType = repeated ? `[]${goType}` : goType;
        
        if (goType === "time.Time") {
          imports.add('time');
        }

        output += `\t${fieldName} ${fieldType} \`json:"${name}"\`\n`;
      }
    }
  }

  if (currentMessage) {
    output += "}\n";
  }

  if (imports.size > 0) {
    output = 'import (\n\t"' + Array.from(imports).join('"\n\t"') + '"\n)\n\n' + output;
  }

  return output;
}

// Proto 类型转 Go 类型
function protoTypeToGo(type: string): string {
  const typeMap: Record<string, string> = {
    'double': 'float64',
    'float': 'float32',
    'int32': 'int32',
    'int64': 'int64',
    'uint32': 'uint32',
    'uint64': 'uint64',
    'sint32': 'int32',
    'sint64': 'int64',
    'fixed32': 'uint32',
    'fixed64': 'uint64',
    'sfixed32': 'int32',
    'sfixed64': 'int64',
    'bool': 'bool',
    'string': 'string',
    'bytes': '[]byte',
    'Timestamp': 'time.Time'
  };
  return typeMap[type] || type;
}

// XML 转 Go 结构体
function xmlToGo(xml: string): string {
  try {
    // 移除 XML 声明
    xml = xml.replace(/<\?xml[^>]+\?>/, '').trim();
    
    // 提取根元素名称
    const rootMatch = xml.match(/<([^\s>]+)/);
    if (!rootMatch) {
      throw new Error('无法找到根元素');
    }
    
    const rootName = rootMatch[1];
    const structName = toPascalCase(rootName);
    let struct = `type ${structName} struct {\n`;
    
    // 提取字段
    const fields = new Map<string, { type: string; isArray: boolean }>();
    const fieldRegex = /<([^>/]+)>([^<]*)<\/\1>/g;
    let match;
    
    while ((match = fieldRegex.exec(xml)) !== null) {
      const [, fieldName, value] = match;
      const existingField = fields.get(fieldName);
      
      if (existingField) {
        existingField.isArray = true;
      } else {
        fields.set(fieldName, {
          type: inferTypeFromValue(value),
          isArray: false
        });
      }
    }
    
    // 生成结构体字段
    for (const [fieldName, { type, isArray }] of fields) {
      const goFieldName = toPascalCase(fieldName);
      const goFieldType = isArray ? `[]${type}` : type;
      struct += `\t${goFieldName} ${goFieldType} \`xml:"${fieldName}" json:"${fieldName}"\`\n`;
    }
    
    struct += "}\n";
    return struct;
  } catch (e) {
    throw new Error('XML 解析错误: ' + (e instanceof Error ? e.message : '未知错误'));
  }
}

function inferTypeFromValue(value: string): string {
  if (value === 'true' || value === 'false') return 'bool';
  if (/^\d+$/.test(value)) return 'int';
  if (/^\d*\.\d+$/.test(value)) return 'float64';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'time.Time';
  return 'string';
}

// CSV 转 Go 结构体
function csvToGo(csv: string): string {
  const lines = csv.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV 至少需要包含标题行和一行数据');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const firstRow = lines[1].split(',').map(v => v.trim());
  
  let struct = "type AutoGen struct {\n";
  
  for (let i = 0; i < headers.length; i++) {
    const fieldName = capitalizeFirst(headers[i]);
    const value = firstRow[i];
    const type = inferTypeFromValue(value);
    struct += `\t${fieldName} ${type} \`json:"${headers[i]}"\`\n`;
  }
  
  struct += "}\n";
  return struct;
}

// 导出新的转换函数
export function convertToGo(input: string, type: 'json' | 'yaml' | 'sql' | 'proto' | 'xml' | 'csv', options?: SQLOptions): string {
  switch (type) {
    case 'json':
      return jsonToGo(JSON.parse(input), 'AutoGen');
    case 'yaml':
      return jsonToGo(YAML.parse(input), 'AutoGen');
    case 'sql':
      return sqlToGoStruct(input, options!);
    case 'proto':
      return protoToGo(input);
    case 'xml':
      return xmlToGo(input);
    case 'csv':
      return csvToGo(input);
    default:
      throw new Error('不支持的格式类型');
  }
}

function toPascalCase(str: string): string {
  return str
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function getGoType(sqlType: string, dbType: DBType): string {
  const typeMap: Record<DBType, Record<string, string>> = {
    mysql: {
      'int': 'int',
      'bigint': 'int64',
      'varchar': 'string',
      'text': 'string',
      'datetime': 'time.Time',
      'timestamp': 'time.Time',
      'boolean': 'bool',
      'decimal': 'float64',
      'float': 'float32',
      'double': 'float64',
      'json': 'json.RawMessage',
      'blob': '[]byte',
    },
    postgres: {
      'integer': 'int',
      'bigint': 'int64',
      'varchar': 'string',
      'text': 'string',
      'timestamp': 'time.Time',
      'boolean': 'bool',
      'decimal': 'float64',
      'real': 'float32',
      'double precision': 'float64',
      'json': 'json.RawMessage',
      'jsonb': 'json.RawMessage',
      'bytea': '[]byte',
    },
    sqlite: {
      'integer': 'int64',
      'text': 'string',
      'varchar': 'string',
      'datetime': 'time.Time',
      'boolean': 'bool',
      'real': 'float64',
      'blob': '[]byte',
    },
    oracle: {
      'number': 'int64',
      'varchar2': 'string',
      'nvarchar2': 'string',
      'clob': 'string',
      'nclob': 'string',
      'date': 'time.Time',
      'timestamp': 'time.Time',
      'float': 'float64',
      'binary_float': 'float32',
      'binary_double': 'float64',
      'raw': '[]byte',
      'blob': '[]byte',
    },
  };

  return typeMap[dbType][sqlType] || 'interface{}';
}

// 添加格式校验函数
export function validateFormat(input: string, type: 'json' | 'yaml' | 'sql' | 'proto' | 'xml' | 'csv'): { isValid: boolean; error?: string } {
  if (!input.trim()) {
    return { isValid: false, error: "输入内容为空" };
  }

  try {
    switch (type) {
      case 'json':
        JSON.parse(input);
        return { isValid: true };
      case 'yaml':
        YAML.parse(input);
        return { isValid: true };
      case 'sql':
        const sqlInput = input.toLowerCase().trim();
        if (!sqlInput.startsWith('create table')) {
          return { isValid: false, error: "SQL 必须以 CREATE TABLE 开始" };
        }
        
        // 提取表名和字段定义部分
        const tableMatch = sqlInput.match(/create\s+table\s+(\w+)\s*\(([\s\S]*)\)/i);
        if (!tableMatch) {
          return { isValid: false, error: "无效的 CREATE TABLE 语句格式" };
        }
        
        const [, tableName, fieldsStr] = tableMatch;
        if (!tableName) {
          return { isValid: false, error: "未找到表名" };
        }
        
        const fields = fieldsStr
          .split(',')
          .map(f => f.trim())
          .filter(f => f);
          
        if (fields.length === 0) {
          return { isValid: false, error: "未找到字段定义" };
        }
        
        // 验证每个字段的格式
        for (const field of fields) {
          // 基本字段格式：字段名 类型 [可选约束]
          const fieldMatch = field.match(/^[a-zA-Z0-9_]+\s+[a-zA-Z0-9_]+(\([0-9,]+\))?\s*(.*)?$/i);
          if (!fieldMatch) {
            return { isValid: false, error: `无效的字段定义: ${field}` };
          }
        }
        
        return { isValid: true };
      case 'proto':
        if (!input.includes('message')) {
          return { isValid: false, error: "未找到 message 定义" };
        }
        return { isValid: true };
      case 'xml':
        // 简单的 XML 格式验证
        if (!input.trim().startsWith('<?xml') && !input.trim().startsWith('<')) {
          return { isValid: false, error: "无效的 XML 格式" };
        }
        // 检查标签是否配对
        const tags: string[] = [];
        const matches = input.match(/<\/?[^>]+>/g);
        if (!matches) {
          return { isValid: false, error: "未找到有效的 XML 标签" };
        }
        for (const tag of matches) {
          if (tag.startsWith('</')) {
            // 闭合标签
            const lastTag = tags.pop();
            if (!lastTag || !tag.includes(lastTag.slice(1, -1))) {
              return { isValid: false, error: "XML 标签不匹配" };
            }
          } else if (!tag.endsWith('/>') && !tag.startsWith('<?')) {
            // 开始标签
            tags.push(tag);
          }
        }
        if (tags.length > 0) {
          return { isValid: false, error: "存在未闭合的 XML 标签" };
        }
        return { isValid: true };
      case 'csv':
        const csvLines = input.split(/\r?\n/).filter(line => line.trim());
        if (csvLines.length < 2) {
          return { isValid: false, error: "CSV 至少需要包含标题行和一行数据" };
        }
        return { isValid: true };
      default:
        return { isValid: false, error: "不支持的格式类型" };
    }
  } catch (e) {
    return { isValid: false, error: `格式错误: ${e instanceof Error ? e.message : '未知错误'}` };
  }
} 