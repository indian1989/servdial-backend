export const extractList = (res) => {
  return res?.data?.data ||
         res?.data?.businesses ||
         res?.data ||
         [];
};

export const extractMeta = (res) => {
  return res?.data?.meta || {};
};