// splitViewURLValidator.js - 现在仅作为兼容层

// 从统一的iframe-compatibility模块导入所有功能
import {
  canLoadInIframe,
  isDomainMatch,
} from "../../utils/iframe-compatibility.js";

// 从常量配置文件导入常量
import { RESTRICTED_DOMAINS, DANGEROUS_PROTOCOLS, DANGEROUS_URL_PATTERNS } from "../../config/constants.js";

// 重新导出所有功能，以保持向后兼容性
export { 
  canLoadInIframe, 
  RESTRICTED_DOMAINS, 
  DANGEROUS_PROTOCOLS, 
  DANGEROUS_URL_PATTERNS, 
  isDomainMatch 
};