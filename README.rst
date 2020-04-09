DB-one - Database Model & API Generator built on top of Sequelize
*****************************************************************

DB One is a package for generating database APIs based on Sequelize model definitions.


Features
========

* generates a complete set of methods for listing, creating, retrieving, updating and
  deleting items
* methods for managing associations (setters, getters and inclusion flags)
* allows for usage of middlewares via hooks, which can be used for extra data
  validation, permissions and logging
* generation can be static or dynamic - it can either generate the class as a file you
  can include in your project or generate the methods dyncamically at runtime


DBGenerator and DBSessionFactory Classes
========================================

The two classes for generating custom DBSession classes both inherit from the
DBModelLoader class. Inherited methods are for loading models and for internal


DBSession Main Class
====================

To obtain this class customized for your database, you need to generate it either
statically or dynamically. For static generation have a look at the `DBGenerator`
section, for dynamic generation check out the `DBSessionFactory` class.

The DB Session is the main class you should be using as a user. It is built around the
DB Core and provides methods for manipulating database entries. Each database table will
have a set of methods based on the table / model name <Entry>/<Entries> (singular/plural).
Some methods refer to a second model for associations <AssocEntry>/<AssocEntries>.

Additionally, there is a set of static methods.

The constructor can be built around an ownerId. An user table can be specified as well as
a group table for user groups (they can be in a one-to-many or many-to-many relationshp).
By default they are set to `users` and `groups` (model names `user` and `group`). If such
a table is found and an ownerId is specified in the constructor session, an ownership chain
will be established for each resource in the database (at query time). This is an important
detail for permission middlewares.


Other Classes
=============


DBCore
------

The DB Core database provides entity-level access to the database via generic functions.
Normally you shouldn't have to do with this class. It stores model information, retrieves
entity from the database, creates entities, stores associations.


Input
=====


