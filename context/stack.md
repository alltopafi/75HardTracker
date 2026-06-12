colorschme tokyo night storm
python 
postgress db
  user table
    username
    name
    hashed/salted password
    current challange id
    number of failed attempts
    
  challange table
    id
    num completed days 
    each day id that is completed or in postgress

  day table
    id
    completed status
    each rule should have own column that represents if it is completed

  logs tables
    timestamp
    level
    message

Starting view should show the 75 hard challange at the top of the page, under that logo it should show how may days have been completed on the current streak and how many times the challange has been completed and restarted if failed, and then in the main part each day should have it's own circle with the day number inside.

clicking on one of those days should pop open a new floating view that will show the rules and a way to complete them; once all of the sub goals are completed the day should be highlighted in the main view to indicate that day has been completed, 


