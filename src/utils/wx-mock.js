const wx = {
  _storage: new Map(),
  _storageLimit: 10 * 1024 * 1024, // 10MB

  getStorage({ key, success, fail }) {
    const data = this._storage.get(key);
    if (data !== undefined) {
      success?.({ data });
    } else {
      const error = { errMsg: 'getStorage:fail data not found' };
      if (fail) {
        fail(error);
      } else {
        throw error;
      }
    }
  },

  setStorage({ key, data }) {
    // 检查存储限制
    const dataSize = JSON.stringify(data).length;
    const currentSize = Array.from(this._storage.values())
      .reduce((size, value) => size + JSON.stringify(value).length, 0);

    if (currentSize + dataSize > this._storageLimit) {
      throw new Error('存储空间不足');
    }

    this._storage.set(key, data);
  },

  getStorageInfoSync() {
    const currentSize = Array.from(this._storage.values())
      .reduce((size, value) => size + JSON.stringify(value).length, 0);

    return {
      currentSize,
      limitSize: this._storageLimit
    };
  },

  clearStorage() {
    this._storage.clear();
  }
};

export { wx }; 