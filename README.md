# PinColor
Plugin for colorizing pins. 

[![Build status](https://ci.appveyor.com/api/projects/status/nqarcjqlqaig2qxp/branch/master?svg=true)](https://ci.appveyor.com/project/VoterScience/pincolor/branch/master)


Clients will check for an 'XColor' column, and if present, use it colorize pins. 
A common technique is to set XColor to an expression based off other columns. The switch() expression is particularly useful here. 
For example, XColor := switch(gender, 'F', 'green', 'M', 'yellow') will colorize based on gender. 

This is based on the trc react templates. See https://github.com/Voter-Science/trc-react for more details.
