# Node Subler

A simple interface for the Subler tool on macOS to write metadata to media files.

## Installation

Requires an additional [SublerCLI](https://bitbucket.org/galad87/sublercli) installation.
To install with [Homebrew](https://brew.sh): `brew cask install sublercli`

By default `Subler` assumes a `homebrew` installation under `/usr/local/bin/SublerCli`.
You can check your installtion path with `brew cask info sublercli`.
If the Subler installation destination deviates from default, you can overwerite the path by setting the `SUBLER_CLI_PATH` environment variable to the valid destination.

## Atoms

To store metadata, Atoms are used. An Atom has a specifc name and the value it stores.
The `AtomStruct` interface mimics this behavior. There is a predefined set of valid atoms.
To obtain a list of al valid metadata atom tag names:

```typescript
const validTags = Atoms.metadataTags();
```

Support for the predefined set of known atoms is individually implemented. `Atoms` functions as a wrapper to store a set of single `Atom` values and is used to create Atoms like:

```javascript
const atoms = new Atoms()
    .add('Cast', 'John Doe')
    .genre('Foo,Bar')
    .artist('Foo Artist')
    .title('Foo Bar Title')
    .release_date('2018');
```

## Tagging

To invoke the Subler process:
If no dest path is supplied then the destination path is the existing file name suffixed, starting from 0: `demo.mp4 -> demo.0.mp4`

```javascript
const file = 'demo.mp4';
const subler = new Subler(file, new Atoms().title('Foo Bar Title'))

    // By default, media kind is already set to `Movie`.
    .media_kind(MediaKind.Movie)

    // Set an optional destination path.
    .dest('dest/path')

    // By default the optimization flag is set to true.
    .optimize(false)

    // Execute process in sync.
    // Alternativly spawn the process: `.spawnTag()`
    .tag();
```
