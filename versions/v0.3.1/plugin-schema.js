/* Shared schema: usable by Node build scripts and extension pages. */
'use strict';
(function (root, create) {
  const schema = create();
  if (typeof module !== 'undefined' && module.exports) module.exports = schema;
  root.LemonSchema = schema;
})(globalThis, () => {
  const ID = /^[a-z][a-z0-9-]{1,39}$/;
  const FIELD_ID = /^[a-z][a-zA-Z0-9-]{0,39}$/;
  const TYPES = new Set(['toggle','text','textarea','number','slider','color','select','url']);
  const CAPABILITIES = new Set(['open-url','storage','background']);
  function assert(test, description) { if (!test) throw new Error(description); }
  function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function only(obj, keys, label) { for (const key of Object.keys(obj)) assert(keys.includes(key), `${label} 不支持字段 ${key}`); }
  function text(value, max, label, allowEmpty = true) { assert(typeof value === 'string' && value.length <= max && (allowEmpty || value.trim()), `${label} 无效`); }
  function validValue(field, value) {
    const kind = field.type;
    if (kind === 'toggle') return typeof value === 'boolean';
    if (kind === 'number' || kind === 'slider') return typeof value === 'number' && Number.isFinite(value) && value >= field.min && value <= field.max && Math.abs((value - field.min)/field.step - Math.round((value - field.min)/field.step)) < 1e-7;
    if (kind === 'color') return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
    if (kind === 'select') return typeof value === 'string' && field.options.some(option => option.value === value);
    if (kind === 'url') {
      if (typeof value !== 'string' || value.length > 2048) return false;
      if (!value) return true;
      try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password; } catch { return false; }
    }
    return typeof value === 'string' && value.length <= (field.maxLength || 200);
  }
  function validateSettings(settings, label) {
    assert(Array.isArray(settings) && settings.length <= 12, `${label}: settings 最多 12 组`);
    const groups = new Set(), keys = new Set();
    for (const group of settings) {
      assert(plain(group), `${label}: 设置分组须为对象`);
      only(group, ['id','title','description','fields'], 'settings 分组');
      assert(FIELD_ID.test(group.id) && !groups.has(group.id), `${label}: 设置组 id 重复或无效`);
      groups.add(group.id); text(group.title, 60, '设置组标题', false);
      if (group.description !== undefined) text(group.description, 240, '设置组说明');
      assert(Array.isArray(group.fields) && group.fields.length >= 1 && group.fields.length <= 20, `${label}: 每组应有 1-20 个字段`);
      for (const field of group.fields) {
        assert(plain(field), `${label}: 设置字段须为对象`);
        only(field, ['key','type','label','description','default','placeholder','min','max','step','maxLength','options'], 'settings 字段');
        assert(FIELD_ID.test(field.key) && !keys.has(field.key), `${label}: 设置 key 重复或无效`);
        keys.add(field.key);
        assert(TYPES.has(field.type), `${label}: 不支持设置类型 ${field.type}`);
        text(field.label, 64, '设置标签', false);
        if (field.description !== undefined) text(field.description, 240, '设置提示');
        if (field.placeholder !== undefined) text(field.placeholder, 120, '占位文本');
        if (field.type === 'number' || field.type === 'slider') {
          assert(typeof field.min === 'number' && typeof field.max === 'number' && Number.isFinite(field.min) && Number.isFinite(field.max) && field.min < field.max && field.max - field.min <= 1000000, '数值范围无效');
          assert(typeof field.step === 'number' && Number.isFinite(field.step) && field.step > 0, '数值 step 无效');
        } else assert(field.min === undefined && field.max === undefined && field.step === undefined, '仅数值类型可设置 min/max/step');
        if (field.type === 'select') {
          assert(Array.isArray(field.options) && field.options.length > 0 && field.options.length <= 30, '下拉选项无效');
          const options = new Set();
          for (const option of field.options) {
            assert(plain(option), '选项须为对象'); only(option, ['value','label'], '下拉选项');
            text(option.value, 120, '选项值', false); text(option.label, 120, '选项标签', false);
            assert(!options.has(option.value), '重复下拉选项'); options.add(option.value);
          }
        } else assert(field.options === undefined, '只有 select 可指定 options');
        if (field.type === 'text' || field.type === 'textarea') {
          const ceiling = field.type === 'textarea' ? 4000 : 500;
          assert(field.maxLength === undefined || (Number.isInteger(field.maxLength) && field.maxLength >= 1 && field.maxLength <= ceiling), 'maxLength 无效');
        } else assert(field.maxLength === undefined, '只有文本类型可以设置 maxLength');
        assert(Object.hasOwn(field, 'default') && validValue(field, field.default), `${label}: ${field.key} 默认值无效`);
      }
    }
    assert(keys.size <= 64, '一个插件最多包含 64 项设置');
    return settings;
  }
  // Protocol v1 remains supported; optional fields are normalized for two-file starters.
  function validatePlugin(value, dirName) {
    assert(plain(value), `${dirName}: plugin.json 必须是对象`);
    only(value, ['id','name','version','apiVersion','description','icon','layout','defaultEnabled','capabilities','settings'], `${dirName}: plugin.json`);
    assert(ID.test(dirName) && value.id === dirName, `${dirName}: ID 与文件夹名称必须一致`);
    text(value.name, 40, 'name', false);
    assert(value.apiVersion === undefined || value.apiVersion === 1, '不支持的插件 API 版本（当前仅支持 1）');
    assert(typeof value.version === 'string' && /^\d+\.\d+\.\d+$/.test(value.version), 'version 必须是 x.y.z');
    const description = value.description ?? '';
    const icon = value.icon ?? '◈';
    const defaultEnabled = value.defaultEnabled ?? false;
    const capabilities = value.capabilities ?? [];
    const layout = { span: 6, height: 240, ...value.layout };
    text(description, 180, 'description');
    assert(typeof icon === 'string' && [...icon].length <= 8, 'icon 无效');
    assert(typeof defaultEnabled === 'boolean', 'defaultEnabled 必须是布尔值');
    assert(plain(value.layout ?? {}), 'layout 无效'); only(value.layout ?? {}, ['span','height','mode'], 'layout');
    assert(Number.isInteger(layout.span) && layout.span >= 1 && layout.span <= 12, 'span 无效');
    assert(Number.isInteger(layout.height) && layout.height >= 130 && layout.height <= 1200, 'height 无效');
    assert(layout.mode === undefined || ['card','fullscreen'].includes(layout.mode), 'layout.mode 无效');
    if (layout.mode === 'fullscreen') assert(layout.span === 12, '全屏插件的 span 应为 12');
    assert(Array.isArray(capabilities) && new Set(capabilities).size === capabilities.length && capabilities.every(c => CAPABILITIES.has(c)), 'capabilities 无效');
    if (value.settings !== undefined) validateSettings(value.settings, dirName);
    return { ...value, apiVersion:1, description, icon, layout, defaultEnabled, capabilities, entry: `plugins/${dirName}/main.js` };
  }
  // Persisted v0.3.0 manifests contain a derived `entry` field. It is not an
  // allowed field in a developer's plugin.json, but must be accepted when
  // reading our own older IndexedDB records. Verify its exact safe value.
  function validateStoredPlugin(value, dirName) {
    assert(plain(value), `${dirName}: 已安装插件信息无效`);
    const { entry, ...manifest } = value;
    if (entry !== undefined) {
      assert(entry === `plugins/${dirName}/main.js`, `${dirName}: 已安装插件入口不匹配`);
    }
    return validatePlugin(manifest, dirName);
  }
  function fields(plugin) { return (plugin.settings || []).flatMap(group => group.fields); }
  function normalize(plugin, stored = {}) {
    const result = Object.create(null);
    for (const field of fields(plugin)) {
      const value = stored && Object.hasOwn(stored, field.key) ? stored[field.key] : field.default;
      result[field.key] = validValue(field, value) ? value : field.default;
    }
    return result;
  }
  return Object.freeze({ validatePlugin, validateStoredPlugin, validateSettings, validValue, normalize, fields });
});
