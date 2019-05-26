import { omit, isClassComponent } from './utils';

/**
 * Convert create element with native tags to BrahmosTagElement.
 * A BrahmosTagElement tag element can be used in similar way as
 * tagged template literals.
 * This are generated by similar usecase
 * createElement('div', props, children);
 */
function createTagElement (element, configs, children) {
  return {
    element,
    values: [configs, children],
    __$isBrahmosTag$__: true,
    __$isBrahmosTagElement$__: true,
  };
}

export default function createElement (
  element,
  configs,
  children,
) {
  /**
   * If the create element is receiving an string element it means it is not a component,
   * but a simple tag instead. In that case return a tagElement instance.
   */
  if (typeof element === 'string') return createTagElement(element, configs, children);

  const props = omit(configs, { key: 1, ref: 1 });

  // add children to props
  props.children = children;

  const { key, ref } = configs;
  const _isClassComponent = isClassComponent(element);

  return {
    type: element,
    props,
    key,
    ref: _isClassComponent ? ref : null,
    children,
    __$isBrahmosComponent$__: true,
    __$isBrahmosClassComponent$__: _isClassComponent,
    __$isBrahmosFunctionalComponent$__: !_isClassComponent,
  };
}
