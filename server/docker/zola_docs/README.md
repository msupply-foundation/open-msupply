## Docker Image To mimic Zola build docs github Action locally

You'll need to build docker image and then run it, steps (all from repo root folder):

<ins>install docker</ins>

https://docs.docker.com/get-docker/

<ins>build image</ins>

(only need to do this once, unless image configurations change)

```BASH
docker build -t zola_remote_docs ./docker/zola_docs/.
```

<ins>run image</ins>

```BASH
docker run -ti -p 1111:1111 -v $(pwd):/home zola_remote_docs
```

The docs should now be accessible on localhost:1111 and update automatically in the same manner as if `zola serve` were being run locally.

To close container:

<kbd><kbd>Ctrl</kbd>+<kbd>c</kbd>

then 

```BASH
exit
```

`$(pwd)` can be replaced with your local repo folder on non linux/mac systems

<ins>docker image maintenance</ins>

After <kbd><kbd>Ctrl</kbd>+<kbd>c</kbd> from docker serve, you are in bash of running container, so can do some command and replicate them to entrypoint.sh (then rebuild and run again)
