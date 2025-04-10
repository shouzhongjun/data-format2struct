export type InputType = 'json' | 'yaml' | 'sql' | 'proto' | 'xml' | 'csv';
export type DBType = 'mysql' | 'postgres' | 'sqlite' | 'oracle';
export type TagType = 'db' | 'gorm' | 'xorm';

export interface ConversionError {
  message: string;
  line?: number;
  column?: number;
}

export interface ConversionResult {
  success: boolean;
  output: string;
  error?: ConversionError;
}

export interface SQLOptions {
  dbType: DBType;
  tagType: TagType;
  usePointer: boolean;
} 