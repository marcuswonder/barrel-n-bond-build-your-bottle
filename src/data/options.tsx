

const WOOD_SWATCHES = [
  { key: 'Light Wood',  hex: '#FBF7EE' },
  { key: 'Medium Wood', hex: '#D4A341' },
  { key: 'Dark Wood',   hex: '#0D0A03' },
] as const;

const WAX_SWATCHES = [
  { key: 'No Wax Seal',      hex: '' },
  { key: 'Sage',             hex: '#5A8D84' },
  { key: 'Steel Blue',       hex: '#165C7D' },
  { key: 'Midnight Blue',    hex: '#00263E' },
  { key: 'Royal Purple',     hex: '#563D82' },
  { key: 'Pink Rose',        hex: '#F99FC9' },
  { key: 'Violet',           hex: '#51284F' },
  { key: 'Burgundy',         hex: '#651D32' },
  { key: 'Tangerine',        hex: '#FF9F1A' },
  { key: 'Stone',            hex: '#D1CCBD' },
  { key: 'Ivory',            hex: '#F1F0E2' },
  { key: 'Brilliant White',  hex: '#FFFFFF' },
  { key: 'Smokey Black',     hex: '#434243' },
] as const;


export { WOOD_SWATCHES, WAX_SWATCHES };