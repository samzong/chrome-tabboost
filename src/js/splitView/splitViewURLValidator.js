// splitViewURLValidator.js - 现在仅作为兼容层

// 从统一的iframeCompatibility模块导入所有功能
import { 
  canLoadInIframe, 
  RESTRICTED_DOMAINS, 
  DANGEROUS_PROTOCOLS, 
  DANGEROUS_URL_PATTERNS, 
  isDomainMatch 
} from "../../utils/iframeCompatibility.js";

// 重新导出所有功能，以保持向后兼容性
export { 
  canLoadInIframe, 
  RESTRICTED_DOMAINS, 
  DANGEROUS_PROTOCOLS, 
  DANGEROUS_URL_PATTERNS, 
  isDomainMatch 
};