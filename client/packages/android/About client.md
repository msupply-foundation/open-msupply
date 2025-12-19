
When app start should try connect to previous server if previously connected to server
- If server changed it's IP address should try to find it
- If server changed it's 

When 'connecting' to server, remember last part ?

Consolidate as much logic as possible in F/E reduce logic, maybe at this point we can bundle in 'electron client' like we do in android

* When in server mode, just connect to server, always on 127.0.0.1
* When restarting in server mode, connect to server (127.0.0.1)

* When starting client and mode is not set (for electron) and no previous hardware id registered, should try 127.0.0.1

* When


* When no mode (probably electron)

* Maybe we can remove some of that logic ?


Laptop facility
Phone app