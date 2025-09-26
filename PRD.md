# 26/09/2025

## Initial Prompt

Let's enrich the database by adding a new database entity that represent a real estate property with the following caracteristics : - a mandatory property name, non mandatory property country, non mandatory property street address, non mandatory property city, non mandatory property zip code, non mandatory property description, and an auto generated numerical unique key. A user can have multiple properties, documents are linked to one property. One property can have several documents but one document is attached to one property. If a property is deleted, the documents, embeddings and chats related to it are deleted as well. The list of real estate properties will be added as a selector showing max 3 of them on the right side of the dashboard. Choosing a real estate property will load the documents and chats context attached to it.

In the dashboard, there the account box with the information about the logged user on the right of the screen. That information should go to its own screen and it should be accessible by a link created with the 'welcome' user name in the top bar of the dashboard. In situ of the actual account box, there should be a box representing the selected real estate property with a link to be able to edit the real estate property's properties.
