## common/localStorage

### Overview

Helpers for working with local storage in the browser.

### Intentions

Colocation of local storage helpers. Intention to try and make working with local storage as type safe and resistant to errors as possible.

### Tips & Things to keep in mind
- It's always possible that the value you think might be in local storage.. isn't! When first initialising, especially. 

### Future considerations

- This module is really built for specific use within omSupply-client. A solution where the keys can be added in a more dynamic way would make this far more extensible.
- Having packages define their local storage keys independently of having to edit this module would be ideal.
