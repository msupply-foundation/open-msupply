I want to produce a tutorial, describing current patterns in this project. This tutorial is targeting developers.
At the end of this tutorial, every team member would have a good idea of how the app is structure and all of it's patterns.  
Following this tutorial a develop would re-create front end from scratch, but with focus is on the functionality and the state, rather then style, components and UI.

Let's plan how this toturial wil be structure, as a result. I want the resulting tutorial in static HTML format, spanning multiple pages.

Please suggest a better structure, but here is a rough idea of how I see things explained.

1 - Graphql codegen, codegen-plugin, apiCall abstraction including auth state and global error
2 - Init, auth, global error component
3 - Store login and store global state
4 - Tan stack table, url query, pagination, sorting, filtering and createResource with API
5 - Using createResource for api calls, re-fetch when variables change, make sure to not propagate suspense in createResource
6 - storeScopedContext