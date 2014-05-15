//Copyright (c) Andrew Jenner 2014
//MIT License

//just like make game
var font = "18px Courier";

var tl = 0
var today = new Array();

var cachedTime = new Array();

var be;
var bc;

var ce;
var c;

var state;

var tileTypes = [
  "Dirt",   "Sea",     "Sand",    "Marsh",   "Mud",
  "Waste",  "Rock",    "Grass",   "Road",    "Facility","Ship"
];
var colors = [
 "#C2C75A", "#033252", "#CAED4C", "#307A40", "#704D28",
 "#857E63", "#AFAFAF", "#82DB69", "#FFFFFF", "#FF00FF", "#FF0000"
];
var world = new Array();
var resources = new Array();
var elen;
var events; //EVENT QUEUE
var worldx;
var worldy;

var facilities;

var pendingPeople;
var pendingWeapons;

var EventEntry = function(days, text, type, x, y, eepeople,eeweapons, success) {
  this.days = days;
  this.text = text;
  this.type = type;
  this.x = x;
  this.y = y;
  this.people = eepeople;
  this.weapons = eeweapons;
  this.success = success;
}

var Resource = function(type) {
  this.type = type;
  this.scouted = false;
  this.difficulty = Math.random();
  this.hazard = Math.random();
  this.stone = Math.floor(Math.random() * 10 * ((type == 6 ||type == 2) ? 6 : 2));
  this.metal = Math.floor(Math.random() * 20 * ((type == 6) ? 4 : 0.5));
  this.food = Math.floor(Math.random() * 5 * ((type == 7) ? 10 : 3));
  this.hunt = Math.floor((3 + Math.random() * 3) * this.difficulty);
  this.gold = Math.floor(Math.max(0, -30 + Math.random() * 50.0 * ((type == 4) ? 1 : 0.9)));
  this.fuel = Math.floor(Math.max(0, -20 + Math.random() * 50.0 * ((type == 3) ? 1.2 : 1)));
  this.getSuccessRate = function(action, people, weapons, buggy) {
    switch (action) {
      case 0: //scouting
        return Math.min(1, 0.5 + 0.5 * (1 - this.difficulty) + 0.1 * people);
      case 1: //gathering
        return Math.min(1, Math.max(0, 1.6 - this.difficulty -
            this.hazard * 0.85 + 0.25 * people + 0.15 * weapons));
      case 2: //hunting
        return Math.min(1, Math.max(0, (1 - this.difficulty) + 0.1 * people + 0.3 * weapons));
      case 3: //building road
        switch (type) {
          case 0:
            return Math.min(1, Math.max(0, 1 - (this.hazard *
                ((weapons > 0) ? 1 : 1 / ( 2 + weapons))) + 0.15 * people));
          case 1:
            return 0;
          case 2:
            return Math.min(1, Math.max(0, 1 - (this.hazard *
                ((weapons > 0) ? 1 : 1 / ( 2 + weapons))) + 0.10 * people));
          case 3:
            return 0;
          case 4:
            return 0;
          case 5:
            return Math.min(1, Math.max(0, 1 - (this.hazard *
                ((weapons > 0) ? 1 : 1 / ( 3 + weapons))) + 0.25 * people));
          case 6:
            return 0;
          case 7:
            return Math.min(1, Math.max(0, 1 - (this. hazard *
                ((weapons > 0) ? 1 : 1 / ( 1 + weapons))) + 0.20 * people));
          case 8:
            return 0;
          case 9:
            return 0;
          case 10:
            return 0;
          default:
            return 0;
        }
      case 4: //building facility
        return Math.min(1, Math.max(0, 0.7 - this.difficulty / 2 -
                (this.hazard * ((weapons > 0) ? 1 :
                1 / ( 2 + weapons))) + 0.30 * people));
      case 5: //repair
        return Math.min(1, .85 + 0.5 * people * ((metal >= 10) ? 1 :
            10.0 / metal));
      case 6: //takeoff
        return (ship >= 100) ? 1 : 0;
      default:
        return 0;
    }
  }

  this.getMoveCost = function() {
    switch(type) {
      case 0:
        return 2;
      case 1:
        return 100000;
      case 2:
        return 4;
      case 3:
        return 8;
      case 4:
        return 5;
      case 5:
        return 2;
      case 6:
        return 7;
      case 7:
        return 2;
      case 8:
        return 1;
      case 9:
        return 0;
      case 10:
        return 0;
      default:
        return 100000;
    }
  }

  this.failPenalty = function() {
    //FIXME
  }

  this.getMoveBuggyCost = function() {
    switch(type) {
      case 0:
        return 1;
      case 1:
        return 100000;
      case 2:
        return 2;
      case 3:
        return 8;
      case 4:
        return 4;
      case 5:
        return 0.5;
      case 6:
        return 4;
      case 7:
        return 1;
      case 8:
        return 0;
      case 9:
        return 0;
      case 10:
        return 0;
      default:
        return 100000;
    }
  }
}

var ready = false;

var mx, my, mx2, my2;
var sx, sy;
var hx = 0, hy = 0;

var day = 0;

var food;
var people;
var fuel = 0; //need x amount to take off, also powers buggies?
var metal = 20;
var stone = 5;
var gold = 0;
var weapons = 3;
var buggies = 0; //FIXME implement later
var ship; //does ship need repairs?

var dirtSnd = new Audio("dirt.wav");
var seaSnd = new Audio("sea.wav");
var marshSnd = new Audio("marsh.wav");
var rockSnd = new Audio("rock.wav");
var sandSnd = new Audio("sand.wav");
var facilitySnd = new Audio("facility.wav");
var roadSnd = new Audio("road.wav");
var shipSnd = new Audio("ship.wav");
var mudSnd = new Audio("mud.wav");
var wasteSnd = new Audio("waste.wav");
var grassSnd = new Audio("grass.wav");

var uiSmallSnd = new Audio("clicksmall.wav");
var uiBigSnd = new Audio("clickbig.wav");

var slx, sly;

var newDay = function() {
  state = 0;
  day++;

  food = Math.max(food - people, 0);

  if (food <= 0 && people > 0) {
    var e = new EventEntry (0, "A crew member died of starvation", 7, 0, 0
    -1, 0, false);
    events.push(e);
    elen++;
  }

  var result = Math.random();

  var sub = 0;
  for (var i = 0; i < elen; i++) {
    var e = events.shift();
    if (e && e.days > 0) {
      e.days--;
      events.push(e);
    } else if (e) {
      today.push(e.text);
      tl++;
      if (e.success) people += e.people;
      if (e.success) weapons += e.weapons;
      if (e.type == 7) people -= 1;
      //alert(e.success + " " + e.text);
      if (e.success) {
        switch(e.type) {
          case 0:
            resources[e.x][e.y].scouted = true;
            break;
          case 1:
            world[e.x][e.y] = 5;
            resources[e.x][e.y].type = 5;

            stone += resources[e.x][e.y].stone;
            resources[e.x][e.y].stone = 0;

            metal += resources[e.x][e.y].metal;
            resources[e.x][e.y].metal = 0;

            food += resources[e.x][e.y].food;
            resources[e.x][e.y].food = 0;

            gold += resources[e.x][e.y].gold;
            resources[e.x][e.y].gold = 0;

            fuel += resources[e.x][e.y].fuel;
            resources[e.x][e.y].fuel = 0;
            break;
          case 2:
            resources[e.x][e.y].hazard = 0;
            food += resources[e.x][e.y].hunt;
            resources[e.x][e.y].hunt = 0;
            break;
          case 3:
            resources[e.x][e.y].scouted = true;
            resources[e.x][e.y].type = 8;
            world[e.x][e.y] = 8;
            break;
          case 4:
            resources[e.x][e.y].scouted = true;
            resources[e.x][e.y].type = 9;
            world[e.x][e.y] = 9;
            facilities++;
            break;
          case 5:
            ship = Math.min(100, ship + 5 + Math.floor(Math.random() * 10));
            break;
          case 6:
            alert("The ship launches, leaving this terrible planet behind. Final score: " + calcScore());
            today = new Array();
            onLoadFunction();
            return;
        }
      } else {
        //FIXME maybe more graceful mission failures?
      }

      sub++;
    }
  }

  elen -= sub;

  if (elen == 0 && people <= 0) {
    //var e = new EventEvery(0, "All your crew have perished...", 8, 0, 0, 0, 0, false);
    //today.push(e.text);
      tl++;
    alert("All of your crew have perished... Final score: " + calcScore());
    today = new Array();
    onLoadFunction();
    return;
  }

  //FIXME random event
};

var onMove = function(e) {
  //get mx and my
  mx2 = -100;
  my2 = -100;
  mx = e.pageX - ce.offsetLeft;
  my = e.pageY - ce.offsetTop;

  //get hx and hy
  if (worldx != 0 && worldy != 0) {
    var w = ce.width / worldx;
    var h = ce.height / worldy;
    hx = Math.floor(mx / w);
    hy = Math.floor(my / h);
  } else {
    hx = 0;
    hy = 0;
  }

  hx = Math.min(worldx - 1, Math.max(0, hx));
  hy = Math.min(worldy - 1, Math.max(0, hy));

  if (state != 0 && mx > ce.width * 0.125 && mx < ce.width * 0.8875 &&
      my > ce.height * 0.8875 - 32 && my < ce.height * 0.8875) {
     ce.style.cursor = "pointer";
  } else if (state == 2 &&
      my > ce.height * 0.125 + 32 && my < ce.height * 0.125 + 70 &&
      mx > ce.width * 0.8875 - 108 && mx < ce.width * 0.8875) {
     ce.style.cursor = "pointer";
  } else {
     ce.style.cursor = "auto";
  }

  //draw
  redraw();
}

var mouseDownButton = function(e) {
  if (!ready || (day == 0 && world[sx][sy] == 1)) return;
  
  mx = -100;
  my = -100;
  mx2 = e.pageX - be.offsetLeft;
  my2 = e.pageY - be.offsetTop;

  if (day == 0 && my2 > 0 && my2 < be.height / 2 && ready && sx && sy &&
      world[sx][sy] != 1) {
    world[sx][sy] = 10;
    resources[sx][sy].type = 10;
    resources[sx][sy].scouted = true;
    resources[sx][sy].stone = 0;
    resources[sx][sy].metal = 0;
    resources[sx][sy].food = 0;
    resources[sx][sy].hunt = 0;
    resources[sx][sy].gold = 0;
    resources[sx][sy].fuel = 0;
    resources[sx][sy].difficulty = 0;
    resources[sx][sy].hazard = 0;
    document.getElementById("output").innerHTML = "Embark on missions to scout areas and gather resources.";
    uiBigSnd.play();
    slx = sx;
    sly = sy;
    newDay();
  } else if (day != 0 && my2 > be.height / 2) {
    uiBigSnd.play();
    newDay();
  } else if (day != 0 && world[sx][sy] != 1 && my2 < be.height / 2 &&
      mx2 < be.width / 2) {
    state = 1;
    uiSmallSnd.play();
  } else if (day != 0 && world[sx][sy] != 1 && my2 < be.height / 2 &&
      mx2 > be.width / 2) {
    uiSmallSnd.play();
    pendingPeople = Math.min(1, people);
    pendingWeapons = 0;
    cachedTime[0] = getTaskTime(0, pendingPeople, sx, sy);
    cachedTime[1] = getTaskTime(1, pendingPeople, sx, sy);
    cachedTime[2] = getTaskTime(2, pendingPeople, sx, sy);
    cachedTime[3] = getTaskTime(3, pendingPeople, sx, sy);
    cachedTime[4] = getTaskTime(4, pendingPeople, sx, sy);
    cachedTime[5] = getTaskTime(5, pendingPeople, sx, sy);
    cachedTime[6] = getTaskTime(6, pendingPeople, sx, sy);
    state = 2;
  }

  document.getElementById("select").innerHTML = "Currently Selected: " +
      tileTypes[world[sx][sy]];
  redraw();
}

var mouseMoveButton = function(e) {
  mx = -100;
  my = -100;
  mx2 = e.pageX - be.offsetLeft;
  my2 = e.pageY - be.offsetTop;
  
  if (my2 > 0 && my2 < be.height / 2 && ready && sx && sy && world[sx][sy] != 1)
     be.style.cursor = "pointer";
  else if (day > 0 && my2 > be.height / 2 && my2 < be.height)
     be.style.cursor = "pointer";
  else be.style.cursor = "auto";
  redraw();
}

var mouseDown = function(e) {

  if (ready && state == 0 && tl <= 0) {
    sx = hx;
    sy = hy;
    document.getElementById("select").innerHTML = "Currently Selected: " +
        tileTypes[world[sx][sy]];

    //selector sfx
    switch (world[sx][sy]) {
      case 0:
        dirtSnd.play();
        break;
      case 1:
        seaSnd.play();
        break;
      case 2:
        sandSnd.play();
        break;
      case 3:
        marshSnd.play();
        break;
      case 4:
        mudSnd.play();
        break;
      case 5:
        wasteSnd.play();
        break;
      case 6:
        rockSnd.play();
        break;
      case 7:
        grassSnd.play();
        break;
      case 8:
        roadSnd.play();
        break;
      case 9:
        facilitySnd.play();
        break;
      case 10:
        shipSnd.play();
        break;
      default:
        dirtSnd.play();
        break;
    }
  } else if (ready && state == 0) {
    today.shift();
    tl--;
    uiSmallSnd.play();
  } else if (ready && state == 1) {
    if (mx < ce.width * 0.125 || mx > ce.width * 0.8875 ||
        my < ce.height * 0.125 || my > ce.height * 0.8875 - 32) {
      uiSmallSnd.play();
      state = 0;
    }
  } else if (ready && state == 2) {
    if (mx < ce.width * 0.125 || mx > ce.width * 0.8875 ||
        my < ce.height * 0.125 || my > ce.height * 0.8875 - 32) {
      uiSmallSnd.play();
      state = 0;
    } else {
      //This needs to handle the menu clicks too!
      //+ and - keys
      if (my > ce.height * 0.125 + 50 && my < ce.height * 0.125 + 70 &&
          mx > ce.width * 0.8875 - 56 && mx < ce.width * 0.8875) {
        if (pendingWeapons > 0) {
          pendingWeapons--;
          uiSmallSnd.play();
          cachedTime[0] = getTaskTime(0, pendingPeople, sx, sy);
          cachedTime[1] = getTaskTime(1, pendingPeople, sx, sy);
          cachedTime[2] = getTaskTime(2, pendingPeople, sx, sy);
          cachedTime[3] = getTaskTime(3, pendingPeople, sx, sy);
          cachedTime[4] = getTaskTime(4, pendingPeople, sx, sy);
          cachedTime[5] = getTaskTime(5, pendingPeople, sx, sy);
          cachedTime[6] = getTaskTime(6, pendingPeople, sx, sy);
        }
      } else if (my > ce.height * 0.125 + 50 && my < ce.height * 0.125 + 70 &&
          mx > ce.width * 0.8875 - 108 && mx < ce.width * 0.8875 - 56) {
        if (pendingWeapons < weapons && pendingWeapons < pendingPeople) {
          pendingWeapons++;
          uiSmallSnd.play();
          cachedTime[0] = getTaskTime(0, pendingPeople, sx, sy);
          cachedTime[1] = getTaskTime(1, pendingPeople, sx, sy);
          cachedTime[2] = getTaskTime(2, pendingPeople, sx, sy);
          cachedTime[3] = getTaskTime(3, pendingPeople, sx, sy);
          cachedTime[4] = getTaskTime(4, pendingPeople, sx, sy);
          cachedTime[5] = getTaskTime(5, pendingPeople, sx, sy);
          cachedTime[6] = getTaskTime(6, pendingPeople, sx, sy);
        }
      } else if (my > ce.height * 0.125 + 30 && my < ce.height * 0.125 + 50 &&
          mx > ce.width * 0.8875 - 56 && mx < ce.width * 0.8875) {
        if (pendingPeople > 1) {
          pendingPeople--;
          uiSmallSnd.play();
          cachedTime[0] = getTaskTime(0, pendingPeople, sx, sy);
          cachedTime[1] = getTaskTime(1, pendingPeople, sx, sy);
          cachedTime[2] = getTaskTime(2, pendingPeople, sx, sy);
          cachedTime[3] = getTaskTime(3, pendingPeople, sx, sy);
          cachedTime[4] = getTaskTime(4, pendingPeople, sx, sy);
          cachedTime[5] = getTaskTime(5, pendingPeople, sx, sy);
          cachedTime[6] = getTaskTime(6, pendingPeople, sx, sy);
        }
        if (pendingWeapons > pendingPeople) pendingWeapons--;
      } else if (my > ce.height * 0.125 + 30 && my < ce.height * 0.125 + 50 &&
          mx > ce.width * 0.8875 - 108 && mx < ce.width * 0.8875 - 56) {
        if (pendingPeople < people) {
          pendingPeople++;
          uiSmallSnd.play();
          cachedTime[0] = getTaskTime(0, pendingPeople, sx, sy);
          cachedTime[1] = getTaskTime(1, pendingPeople, sx, sy);
          cachedTime[2] = getTaskTime(2, pendingPeople, sx, sy);
          cachedTime[3] = getTaskTime(3, pendingPeople, sx, sy);
          cachedTime[4] = getTaskTime(4, pendingPeople, sx, sy);
          cachedTime[5] = getTaskTime(5, pendingPeople, sx, sy);
          cachedTime[6] = getTaskTime(6, pendingPeople, sx, sy);
        }
      }


      if (world[sx][sy] != 8 && world[sx][sy] != 9) {
      //plan of action
      //first find button loction
      var button = -1;
      if (mx > ce.width * 0.125 && mx < ce.width * 0.5 &&
          my > ce.height * 0.125 + 60 && my < ce.height * 0.8875 - 40) {
        var offset = my - ce.height * 0.125 - 90; //TOLO
        button = Math.floor(offset / 32);
      } 

      //then determine what button that is
      var startMission = function(type, mpeople, mweapons, x, y) {
        people -= mpeople;
        weapons -= mweapons;
        var success = Math.random() < resources[x][y].getSuccessRate(type,
        mpeople, mweapons, false);
        if (success) {
          switch (type) {
            case 0:
              var e = new EventEntry(cachedTime[0], "Scouting was a success.",
              0, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
            case 1:
              var e = new EventEntry(cachedTime[1], "Gathering was a success.",
              1, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
            case 2:
              var e = new EventEntry(cachedTime[2], "Hunting was a success.",
              2, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
            case 3:
              var e = new EventEntry(cachedTime[3],"You have built a road.",
              3, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
            case 4:
              var e = new EventEntry(cachedTime[4],"You have built a facility.",
              4, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
            case 5:
              var e = new EventEntry(cachedTime[5], "The ship was repaired.",
              5, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
            case 6:
              var e = new EventEntry(cachedTime[6], "The ship blasts off.",
              6, x, y, mpeople, mweapons, true);
              events.push(e);
              elen++;
              break;
          }
        } else {
          switch (type) {
            case 0:
              var e = new EventEntry(cachedTime[0],"The scouts never returned.",
              0, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
            case 1:
              var e=new EventEntry(cachedTime[1],"Gathering failed to succeed.",
              1, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
            case 2:
              var e = new EventEntry(cachedTime[2],"The hunting team perished.",
              2, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
            case 3:
              var e=new EventEntry(cachedTime[3],"The road failed to be built.",
              3, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
            case 4:
              var e = new EventEntry(cachedTime[4], "Construction failed.",
              4, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
            case 5:
              var e=new EventEntry(cachedTime[5],"Ship repair failed.",
              5, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
            case 6:
              var e = new EventEntry(cachedTime[6], "The launch failed.",
              6, x, y, mpeople, mweapons, false);
              events.push(e);
              elen++;
              break;
          }
        }
      };

      if (button != -1 && pendingPeople > 0) {
        if (world[sx][sy] == 10) {
          if (button == 0 && ship >= 100) {
            startMission(6, pendingPeople, pendingWeapons, sx, sy);
            uiBigSnd.play();
            state = 0;
          } else if (button == 0) {
            startMission(5, pendingPeople, pendingWeapons, sx, sy);
            uiBigSnd.play();
            state = 0;
          } else if (button == 1) {
            startMission(6, pendingPeople, pendingWeapons, sx, sy);
            uiBigSnd.play();
            state = 0;
          }
        } else {
          if (resources[sx][sy].scouted) {
            switch (button) {
              case 0: //gathering
                startMission(1, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 1: //hunting
                startMission(2, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 2: //road
                startMission(3, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 3: //facility
                startMission(4, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 4: //nothing
                break;
            }
          } else {
            switch (button) {
              case 0: //scout
                startMission(0, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 1: //gathering
                startMission(1, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 2: //hunting
                startMission(2, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 3: //road
                startMission(3, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
              case 4: //facility
                startMission(4, pendingPeople, pendingWeapons, sx, sy);
                uiBigSnd.play();
                state = 0;
                break;
            }
          }
        }
      }
      }
    }
  }

  redraw();
}

var genWorld = function() {
  //generate world

  worldx = 32;
  worldy = 32;

  for (var i = 0; i < worldx; i++) {
    world[i] = new Array();
    for (var j = 0; j < worldy; j++) {
      world[i][j] = 5;
    }
  }

  for (var i = 0; i < worldx; i++) {
    world[i][0] = 1;
    world[i][worldy - 1] = 1;
  }

  for (var i = 0; i < worldy; i++) {
    world[0][i] = 1;
    world[worldx - 1][i] = 1;
  }

  //~30, ~7000 seems to work well, but high values seem to work great too
  var xFactor = 30;
  var cutoff = 7000;
  
  for (var i = 0; i < worldx * worldy * xFactor; i++) {
    var cx = Math.floor((Math.random() * worldx));
    var cy = Math.floor((Math.random() * worldy));

    if (cx == 0) cx += 1;
    else if (cx == worldx - 1) cx -= 1;
    if (cy == 0) cy += 1;
    else if (cy == worldx - 1) cy -= 1;

    var old = world[cx][cy];

    var result = Math.random();
    if (result < 0.20) {
      world[cx][cy] = world[cx][cy - 1];
    } else if (result < 0.4) {
      world[cx][cy] = world[cx][cy + 1];
    } else if (result < 0.6) {
      world[cx][cy] = world[cx - 1][cy];
    } else if (result < 0.8){
      world[cx][cy] = world[cx + 1][cy];
    } else if (i < cutoff) {
      world[cx][cy] = Math.floor(Math.random() * 9);
      if (world[cx][cy] > 7) world[cx][cy] = 0;
    }
  }

  for (var i = 0; i < worldx; i++) {
    resources[i] = new Array();
    for (var j = 0; j < worldy; j++) {
      resources[i][j] = new Resource(world[i][j]);
    }
  }

  ready = true;
}

var drawWorld = function(c) {
  //hackdraw world
  for (var i = 0; i < worldx; i++) {
    for (var j = 0; j < worldy; j++) {
      var w = ce.width / worldx;
      var h = ce.height / worldy;
      if (world[i][j] != 1) {
        var grd = c.createRadialGradient(i * w + w / 2, j * h + h / 2, h / 8,
            i * w + w / 2, j * h + h / 2, h * 1.2);
        grd.addColorStop(0, colors[world[i][j]]);
        grd.addColorStop(1, "#000000");
        c.fillStyle = grd;
        //c.fillStyle = colors[world[i][j]];
        c.fillRect(i * w, j * h, w, h); 
      } else {
      }
    }
  }
}


var onLoadFunction = function() {
  //get contexts
  ready = false;
  tl = 0;
  ce = document.getElementById("appContext");
  c = ce.getContext("2d");

  be = document.getElementById("buttonContext");
  bc = be.getContext("2d");

  //setup
  state = 0;
  px = 0;
  py = 0;

  genWorld();

  food = 250;
  people = 10;
  fuel = 0; //need x amount to take off, also powers buggies?
  metal = 20;
  stone = 5;
  gold = 0;
  weapons = 3;
  buggies = 0; //FIXME implement later
  facilities = 0;
  day = 0;
  ship = 100 - Math.floor(Math.random() * 60);
  events = new Array();
  elen = 0;

  //set event handlers
  ce.onmousemove = onMove;
  ce.onmousedown = mouseDown;
  be.onmousemove = mouseMoveButton;
  be.onmousedown = mouseDownButton;

  //draw

  redraw();

  //main loop???
}

var calcScore = function() {
  return Math.floor(Math.max(0, -500 + (ship + food + fuel * 2 + stone * 2
      + metal * 3 + gold * 5 + facilities * 40) * (0.25 + people / 10)));
}

var redraw = function() {
  c.fillStyle = "#FFFFFF";
  var img = document.getElementById("seaimg");
  c.fillStyle = c.createPattern(img, "repeat");
  c.fillRect(0, 0, ce.width, ce.height);

  drawWorld(c);

  if (state == 0) {
    if (tl <= 0) {
      //draw tooltip and highlight
      var w = ce.width / worldx;
      var h = ce.height / worldy;
      //mouseover highlight
      c.strokeStyle = "#A00000";
      c.lineWidth = 1;
      c.strokeRect(hx * w, hy * h, w, h);

      //selection highlight
      c.strokeStyle = "#FF0000";
      c.lineWidth = 4;
      c.strokeRect(sx * w, sy * h, w, h);

      //tooltip
      if (ready) {
        c.font = font;
        var txt = tileTypes[world[hx][hy]];
        var ext = " - Scouted";
        if (resources[hx][hy].scouted) txt += ext;
        c.fillStyle = "#404040";
        c.strokeStyle = "#A00000";
        c.lineWidth = 1;
        var tm = c.measureText(txt);
        c.shadowBlur = 20;
        c.shadowColor = "#000000";
        c.fillRect(mx, my - 15, tm.width + 4, 22);
        c.fillStyle = "#FFFFFF";
        c.fillText(txt, mx + 2, my + 2);
        c.shadowBlur = 0;
      }
    } else {
      //TODO draw notification window
      var txt = today.shift();
      today.unshift(txt);
      var w = ce.width * 0.75;
      var h = ce.height * 0.75;
      //main window
      c.shadowBlur = 40;
      c.shadowColor = "#000000";
      c.fillStyle = "#202020";
      c.strokeStyle = "#000000";
      c.lineWidth = 8;
      c.strokeRect(ce.width * 0.125, ce.height * 0.125, w, h);
      c.fillRect(ce.width * 0.125, ce.height * 0.125, w, h);
      c.shadowBlur = 20;
      c.fillStyle = "#7F7F7F";
      var tw = c.measureText("Click anywhere to dismiss.");
      c.fillText("Click anywhere to dismiss", ce.width / 2 - tw.width / 2,
          ce.height * 0.8875 - 18);
      tw = c.measureText("Breaking News:");
      c.fillStyle = "#FFFFFF";
      c.fillText("Breaking News:", ce.width / 2 - tw.width / 2,
          ce.height * 0.125 + 18);
      c.fillStyle = "#FFFFFF";
      c.fillText(txt, ce.width * 0.125 + 4, ce.height * 0.125 + 38);
      c.shadowBlur = 0;
    }
  } else if (state == 1) { //info menu is open
    var w = ce.width * 0.75;
    var h = ce.height * 0.75;
    //main window
    c.shadowBlur = 40;
    c.shadowColor = "#000000";
    c.fillStyle = "#202020";
    c.strokeStyle = "#000000";
    c.lineWidth = 8;
    c.strokeRect(ce.width * 0.125, ce.height * 0.125, w, h);
    c.fillRect(ce.width * 0.125, ce.height * 0.125, w, h);
    c.shadowBlur = 20;
    //close button
    if (my < ce.height * 0.8875 && my > ce.height * 0.8875 - 32 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.8875) {
      c.fillStyle = "#FF0000";
    } else c.fillStyle = "#A00000";
    c.fillRect(ce.width * 0.125 + 4, ce.height * 0.8875 - 38, w - 8, 28);
    c.fillStyle = "#FFFFFF";
    var tw = c.measureText("Dismiss Info Window");
    c.fillText("Dismiss Info Window", ce.width / 2 - tw.width / 2,
        ce.height * 0.8875 - 18);
    var txt = tileTypes[world[sx][sy]];
    tw = c.measureText(txt);
    c.fillText(txt, ce.width / 2 - tw.width / 2,
        ce.height * 0.125 + 18);
    if (world[sx][sy] == 10) {
      //ship info
      c.fillStyle = "#FFFFFF";
      c.fillText("People: " + people, ce.width * 0.125 + 4,
          ce.height * 0.125 + 38);
      c.fillText("Ship Condition: " + ship + "/" + 100, ce.width * 0.125 + 4,
          ce.height * 0.125 + 58);
      c.fillText("Fuel: " + fuel + "/" + 30, ce.width * 0.125 + 4,
          ce.height * 0.125 + 78);
      c.fillText("Food: " + food, ce.width * 0.125 + 4,
          ce.height * 0.125 + 98);
      c.fillText("Metal: " + metal, ce.width * 0.125 + 4,
          ce.height * 0.125 + 118);
      c.fillText("Stone: " + stone, ce.width * 0.125 + 4,
          ce.height * 0.125 + 138);
      c.fillText("Weapons: " + weapons + "/" + 3, ce.width * 0.125 + 4,
          ce.height * 0.125 + 158);
      c.fillText("Gold: " + gold, ce.width * 0.125 + 4,
          ce.height * 0.125 + 178);
    } else if (resources[sx][sy].scouted){
      var offset = 78;
      c.fillStyle = "#FFFFFF";
      c.fillText("Danger Level: " + resources[sx][sy].hazard * 100 + "%",
          ce.width * 0.125 + 4, ce.height * 0.125 + 38);
      c.fillText("Difficulty: " + resources[sx][sy].difficulty * 100 + "%",
          ce.width * 0.125 + 4, ce.height * 0.125 + 58);
      if (resources[sx][sy].food > 0)
          c.fillText("Food: " + resources[sx][sy].food,
          ce.width * 0.125 + 4, ce.height * 0.125 + (offset += 20));
      if (resources[sx][sy].fuel > 0)
          c.fillText("Fuel: " + resources[sx][sy].fuel,
          ce.width * 0.125 + 4, ce.height * 0.125 + (offset += 20));
      if (resources[sx][sy].metal > 0)
          c.fillText("Metal: " + resources[sx][sy].metal,
          ce.width * 0.125 + 4, ce.height * 0.125 + (offset += 20));
      if (resources[sx][sy].stone > 0)
          c.fillText("Stone: " + resources[sx][sy].stone,
          ce.width * 0.125 + 4, ce.height * 0.125 + (offset += 20));
      if (resources[sx][sy].gold > 0)
          c.fillText("Gold: " + resources[sx][sy].gold,
          ce.width * 0.125 + 4, ce.height * 0.125 + (offset += 20));
    } else {
      c.fillStyle = "#FFFFFF";
      c.fillText("Not Scouted", ce.width * 0.125 + 4,
          ce.height * 0.125 + 38);
      c.fillStyle = "#7F7F7F";
      c.fillText("Embark on a scouting mission here", ce.width * 0.125 + 4,
          ce.height * 0.125 + 58);
      c.fillText("to learn more about this region.", ce.width * 0.125 + 4,
          ce.height * 0.125 + 78);
    }
    c.shadowBlur = 0;
  } else if (state == 2) { //mission menu is open
    var w = ce.width * 0.75;
    var h = ce.height * 0.75;
    //main window
    c.shadowBlur = 40;
    c.shadowColor = "#000000";
    c.fillStyle = "#202020";
    c.strokeStyle = "#000000";
    c.lineWidth = 8;
    c.strokeRect(ce.width * 0.125, ce.height * 0.125, w, h);
    c.fillRect(ce.width * 0.125, ce.height * 0.125, w, h);
    c.shadowBlur = 20;
    //close button
    if (my < ce.height * 0.8875 && my > ce.height * 0.8875 - 32 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.8875) {
      c.fillStyle = "#FF0000";
    } else c.fillStyle = "#A00000";
    c.fillRect(ce.width * 0.125 + 4, ce.height * 0.8875 - 38, w - 8, 28);
    c.fillStyle = "#FFFFFF";
    var tw = c.measureText("Dismiss Mission Window");
    c.fillText("Dismiss Mission Window", ce.width / 2 - tw.width / 2,
        ce.height * 0.8875 - 18);
    var txt = "Mission: " + tileTypes[world[sx][sy]];
    tw = c.measureText(txt);
    c.fillText(txt, ce.width / 2 - tw.width / 2,
        ce.height * 0.125 + 18);
    //mission info
    c.fillText("People to Send: " + pendingPeople + "/" + people,
        ce.width * 0.125 + 4, ce.height * 0.125 + 38);
    c.fillText("Weapons to Send: " + pendingWeapons + "/" + weapons,
        ce.width * 0.125 + 4, ce.height * 0.125 + 58);
    c.fillText("Mission Type:",
        ce.width * 0.125 + 4, ce.height * 0.125 + 78);
    c.fillText("Success Rate:",
        ce.width * 0.5 + 4, ce.height * 0.125 + 78);
    var tm = c.measureText("-");
    var tp = c.measureText("+");
    //lower right
    if (my > ce.height * 0.125 + 50 && my < ce.height * 0.125 + 70 &&
        mx > ce.width * 0.8875 - 56 && mx < ce.width * 0.8875) {
      c.fillStyle = "#FF0000";
    } else c.fillStyle = "#A00000";
    c.fillRect(ce.width * 0.8875 - 56, ce.height * 0.125 + 46, 48, 16);
    c.fillStyle = "#FFFFFF";
    c.fillText("-",ce.width * 0.8875 - 32 - tm.width / 2, ce.height * 0.125+60);
    //lower left
    if (my > ce.height * 0.125 + 50 && my < ce.height * 0.125 + 70 &&
        mx > ce.width * 0.8875 - 108 && mx < ce.width * 0.8875 - 56) {
      c.fillStyle = "#FF0000";
    } else c.fillStyle = "#A00000";
    c.fillRect(ce.width * 0.8875 - 108, ce.height * 0.125 + 46, 48, 16);
    c.fillStyle = "#FFFFFF";
    c.fillText("+",ce.width * 0.8875 - 84 - tp.width / 2, ce.height * 0.125+60);
    //upper right
    if (my > ce.height * 0.125 + 30 && my < ce.height * 0.125 + 50 &&
        mx > ce.width * 0.8875 - 56 && mx < ce.width * 0.8875) {
      c.fillStyle = "#FF0000";
    } else c.fillStyle = "#A00000";
    c.fillRect(ce.width * 0.8875 - 56, ce.height * 0.125 + 26, 48, 16);
    c.fillStyle = "#FFFFFF";
    c.fillText("-",ce.width * 0.8875 - 32 - tm.width / 2, ce.height * 0.125+40);
    //upper left
    if (my > ce.height * 0.125 + 30 && my < ce.height * 0.125 + 50 &&
        mx > ce.width * 0.8875 - 108 && mx < ce.width * 0.8875 - 56) {
      c.fillStyle = "#FF0000";
    } else c.fillStyle = "#A00000";
    c.fillRect(ce.width * 0.8875 - 108, ce.height * 0.125 + 26, 48, 16);
    c.fillStyle = "#FFFFFF";
    c.fillText("+",ce.width * 0.8875 - 84 - tp.width / 2, ce.height * 0.125+40);
    //mission start buttons
    var offset = 98;
    if (world[sx][sy] < 8) {
      if (!resources[sx][sy].scouted) {
        //scouting
        if (my > ce.height * 0.125 + offset &&
          my < ce.height * 0.125 + offset + 30 &&
          mx > ce.width * 0.125 && mx < ce.width * 0.5) {
          c.fillStyle = "#FF0000";
        } else c.fillStyle = "#A00000";
        c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
             ce.width * 0.75 * 0.5 - 8, 24);
        c.fillStyle = "#FFFFFF";
        var rt = "Scouting";
        var rw = c.measureText(rt);
        c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
            ce.height * 0.125 + offset + 18);
        c.fillText(Math.floor(resources[sx][sy].getSuccessRate(0, pendingPeople, pendingWeapons, false) * 100) +
            "% " + cachedTime[0] + " day(s)",
            ce.width * 0.5 + 4,
            ce.height * 0.125 + offset + 18);
        offset += 32;
      }
      //gathering mission
      if (my > ce.height * 0.125 + offset &&
        my < ce.height * 0.125 + offset + 30 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.5) {
        c.fillStyle = "#FF0000";
      } else c.fillStyle = "#A00000";
      c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
           ce.width * 0.75 * 0.5 - 8, 24);
      c.fillStyle = "#FFFFFF";
      var rt = "Gathering";
      var rw = c.measureText(rt);
      c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
          ce.height * 0.125 + offset + 18);
      c.fillText(Math.floor(resources[sx][sy].getSuccessRate(1, pendingPeople, pendingWeapons, false) * 100) +
          "% " + cachedTime[1] + " day(s)",
          ce.width * 0.5 + 4,
          ce.height * 0.125 + offset + 18);
      offset += 32;
      //hunting mission
      if (my > ce.height * 0.125 + offset &&
        my < ce.height * 0.125 + offset + 30 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.5) {
        c.fillStyle = "#FF0000";
      } else c.fillStyle = "#A00000";
      c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
           ce.width * 0.75 * 0.5 - 8, 24);
      c.fillStyle = "#FFFFFF";
      var rt = "Hunting";
      var rw = c.measureText(rt);
      c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
          ce.height * 0.125 + offset + 18);
      c.fillText(Math.floor(resources[sx][sy].getSuccessRate(2, pendingPeople, pendingWeapons, false) * 100) +
          "% " + cachedTime[2] + " day(s)",
          ce.width * 0.5 + 4,
          ce.height * 0.125 + offset + 18);
      offset += 32;
      //build road
      if (my > ce.height * 0.125 + offset &&
        my < ce.height * 0.125 + offset + 30 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.5) {
        c.fillStyle = "#FF0000";
      } else c.fillStyle = "#A00000";
      c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
           ce.width * 0.75 * 0.5 - 8, 24);
      c.fillStyle = "#FFFFFF";
      var rt = "Build Road";
      var rw = c.measureText(rt);
      c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
          ce.height * 0.125 + offset + 18);
      c.fillText(Math.floor(resources[sx][sy].getSuccessRate(3, pendingPeople, pendingWeapons, false) * 100) +
          "% " + cachedTime[3] + " day(s)",
          ce.width * 0.5 + 4,
          ce.height * 0.125 + offset + 18);
      offset += 32;
      //build facil
      if (my > ce.height * 0.125 + offset &&
        my < ce.height * 0.125 + offset + 30 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.5) {
        c.fillStyle = "#FF0000";
      } else c.fillStyle = "#A00000";
      c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
           ce.width * 0.75 * 0.5 - 8, 24);
      c.fillStyle = "#FFFFFF";
      var rt = "Build Facility";
      var rw = c.measureText(rt);
      c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
          ce.height * 0.125 + offset + 18);
      c.fillText(Math.floor(resources[sx][sy].getSuccessRate(4, pendingPeople, pendingWeapons, false) * 100) +
          "% " + cachedTime[4]+ " day(s)",
          ce.width * 0.5 + 4,
          ce.height * 0.125 + offset + 18);
      offset += 32;
    } else { //ship missions
      //repair
      if (ship < 100) {
        if (my > ce.height * 0.125 + offset &&
          my < ce.height * 0.125 + offset + 30 &&
          mx > ce.width * 0.125 && mx < ce.width * 0.5) {
          c.fillStyle = "#FF0000";
        } else c.fillStyle = "#A00000";
        c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
             ce.width * 0.75 * 0.5 - 8, 24);
        c.fillStyle = "#FFFFFF";
        var rt = "Repair";
        var rw = c.measureText(rt);
        c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
            ce.height * 0.125 + offset + 18);
        c.fillText(Math.floor(resources[sx][sy].getSuccessRate(5, pendingPeople, pendingWeapons, false) * 100) +
            "% " + cachedTime[5] + " day(s)",
            ce.width * 0.5 + 4,
            ce.height * 0.125 + offset + 18);
        offset += 32;
      }
      //launch ship
      if (my > ce.height * 0.125 + offset &&
        my < ce.height * 0.125 + offset + 30 &&
        mx > ce.width * 0.125 && mx < ce.width * 0.5) {
        c.fillStyle = "#FF0000";
      } else c.fillStyle = "#A00000";
      c.fillRect(ce.width * 0.125 + 4, ce.height * 0.125 + offset,
           ce.width * 0.75 * 0.5 - 8, 24);
      c.fillStyle = "#FFFFFF";
      var rt = "Launch Ship";
      var rw = c.measureText(rt);
      c.fillText(rt, ce.width * 0.3125 - rw.width / 2,
          ce.height * 0.125 + offset + 18);
      c.fillText(Math.floor(resources[sx][sy].getSuccessRate(6, pendingPeople, pendingWeapons, false) * 100) +
          "% " + cachedTime[6] + " day(s)",
          ce.width * 0.5 + 4,
          ce.height * 0.125 + offset + 18);
    }
    c.shadowBlur = 0;
  }

  //draw status, if applicable
  if (day > 0) {
    c.font = font;
    var txt = "Day " + day;
    c.shadowBlur = 20;
    c.shadowColor = "#000000";
    c.fillStyle = "#FFFFFF";
    c.fillText(txt, 4, 20);
    c.fillText("Score: " + calcScore(), 4, 40);
    c.shadowBlur = 0;
  }

  //also do the button context drawing!
  bc.font = font;
  bc.fillStyle = "#202020";
  bc.fillRect(0, 0, be.width, be.height);

  if (!ready) return;

  if (day == 0 && sx && sy && world[sx][sy] != 1) {
    bc.shadowBlur = 20;
    bc.shadowColor = "#000000";
    if (my2 > 0 && my2 < be.height / 2) bc.fillStyle = "#FF0000";
    else bc.fillStyle = "#A00000"; //if highlighted draw different color
    bc.fillRect(4, 4, be.width - 8, be.height / 2 - 8);
    bc.fillStyle = "#FFFFFF";
    var tw = bc.measureText("Land Here");
    bc.fillText("Land Here", be.width / 2 - tw.width / 2, 22);
    bc.shadowBlur = 0;
  } else if (day == 0) {
    bc.lineWidth = 1;
    bc.fillStyle = "#7F7F7F";
    bc.strokeStyle = "#7F7F7F";
    bc.strokeRect(4, 4, be.width - 8, be.height / 2 - 8);
    var tw = bc.measureText("Can't land on water!");
    bc.fillText("Can't land on water!", be.width / 2 - tw.width / 2, 22);
  } else if (sx && sy && world[sx][sy] != 1) {
    //render buttons
    bc.shadowBlur = 20;
    bc.shadowColor = "#000000";
    if (my2 > 0 && my2 < be.height / 2 && mx2 < be.width / 2) {
      bc.fillStyle = "#FF0000";
    } else bc.fillStyle = "#A00000";
    bc.fillRect(4, 4, be.width / 2 - 6, be.height / 2 - 6);
    bc.fillStyle = "#FFFFFF";
    var tw = bc.measureText("Display Info");
    bc.fillText("Display Info", be.width / 4 - tw.width / 2, 22);
    if (my2 > 0 && my2 < be.height / 2 && mx2 > be.width / 2) {
      bc.fillStyle = "#FF0000";
    } else bc.fillStyle = "#A00000";
    bc.fillRect(be.width / 2 + 4, 4, be.width / 2 - 6, be.height / 2 - 6);
    bc.fillStyle = "#FFFFFF";
    tw = bc.measureText("Embark on Mission");
    bc.fillText("Embark on Mission", (be.width / 4 * 3) - tw.width / 2, 22);
    bc.shadowBlur = 0;
  }

  if (day == 0) {
    //chance of crash & resource density
    //FIXME later whatever
  } else {
    //next day button
    bc.shadowBlur = 20;
    bc.shadowColor = "#000000";
    if (my2 < be.height && my2 > be.height / 2) bc.fillStyle = "#FF0000";
    else bc.fillStyle = "#A00000";
    bc.fillRect(4, be.height / 2 + 4, be.width - 6, be.height / 2 - 8);
    bc.fillStyle = "#FFFFFF";
    var tw = bc.measureText("Advance to Next Day");
    bc.fillText("Advance to Next Day", be.width / 2 - tw.width / 2, 54);
    bc.shadowBlur = 0;
  }
}

var getTaskTime = function(type, hands, x, y) {
  var constant;
  switch (type) {
    case 0:
      constant = 6 * hands;
      break;
    case 4:
      constant = 70 / hands;
      break;
    case 6:
      constant = 72;
      break;
    default:
      constant = 24 / hands;
      break;
  }
  //a* travel time
  var CoordCouple = function(tx, ty, g, par) {
    this.x = tx;
    this.y = ty;
    this.g = g;
    this.h = Math.abs(this.x - x) + Math.abs(this.y - y);
    this.f = this.g + this.h;
    this.par = par;
  }

  var best = 0;
  var closed = new Array();
  var cl = 0;
  var open = new Array();
  var ol = 0;
  //var map = new Array();

  open.push(new CoordCouple(slx, sly, 0, null));
  ol++;
  
  while (ol > 0) {
    var a = open.pop();
    ol--;
    //up
    if (a.y > 0 && world[a.x][a.y - 1] != 1) {
      var b = new CoordCouple(a.x, a.y - 1,
          a.g + resources[a.x][a.y - 1].getMoveCost());
      if (b.y == y && b.x == x) {
        best = b.f;
        break;
      }
      var skip = false;
      for (var i = 0; i < ol; i++) {
        var c = open.shift();
        open.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      for (var i = 0; i < cl; i++) {
        var c = closed.shift();
        closed.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      if (!skip) {
        open.push(b);
        ol++;
      }
    }
    //down
    if (a.y < worldy - 1 && world[a.x][a.y + 1] != 1) {
      var b = new CoordCouple(a.x, a.y + 1,
          a.g + resources[a.x][a.y + 1].getMoveCost());
      if (b.y == y && b.x == x) {
        best = b.f;
        break;
      }
      var skip = false;
      for (var i = 0; i < ol; i++) {
        var c = open.shift();
        open.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      for (var i = 0; i < cl; i++) {
        var c = closed.shift();
        closed.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      if (!skip) {
        open.push(b);
        ol++;
      }
    }
    //left
    if (a.x > 0 && world[a.x - 1][a.y] != 1) {
      var b = new CoordCouple(a.x - 1, a.y,
          a.g + resources[a.x - 1][a.y].getMoveCost());
      if (b.y == y && b.x == x) {
        best = b.f;
        break;
      }
      var skip = false;
      for (var i = 0; i < ol; i++) {
        var c = open.shift();
        open.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      for (var i = 0; i < cl; i++) {
        var c = closed.shift();
        closed.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      if (!skip) {
        open.push(b);
        ol++;
      }
    }
    //right
    if (a.x < worldx - 1 && world[a.x + 1][a.y] != 1) {
      var b = new CoordCouple(a.x + 1, a.y,
          a.g + resources[a.x + 1][a.y].getMoveCost());
      if (b.y == y && b.x == x) {
        best = b.f;
        break;
      }
      var skip = false;
      for (var i = 0; i < ol; i++) {
        var c = open.shift();
        open.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      for (var i = 0; i < cl; i++) {
        var c = closed.shift();
        closed.push(c);
        if (c.x == b.x && c.y == b.y) {
          skip = true;
          break;
        }
      }
      if (!skip) {
        open.push(b);
        ol++;
      }
    }
    closed.push(a);
    cl++;
  }

  return Math.ceil((constant + best) / 24);
}
