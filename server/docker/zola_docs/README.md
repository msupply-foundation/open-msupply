## Docker Image To mimic Zola build docs github Action locally

You'll need to build docker image and then run it, steps (all from repo root folder):

<ins>install docker</ins>

https://docs.docker.com/get-docker/

<ins>buid image</ins>

(only need to do this once, unless image configurations change)

```BASH
docker build -t zola_remote_docs ./docker/zola_docs/.
```

<ins>run image</ins>

```BASH
docker run -v $(pwd):/home zola_remote_docs
```

That's it, you should see build docs in `docs_dev` folder, open index file to see. Re-run to rebuild

`$(pwd)` can be replaced with your local repo folder on non linux/mac systems

<ins>docker image maintenance</ins>

Can run the following to bash into the image and run commands

`docker run -ti -v $(pwd):/home zola_remote_docs`

After that update entrypoint.sh file, then rebuild image and check by running
