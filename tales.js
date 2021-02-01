Array.prototype.cut = function(target){ this.splice (this.indexOf(target), 1); };

var template_char = {
    'health': 100, 'healthmax': 100, "energy": 100, "energymax": 100, "oxygen": 100, 'inventory': [], 'money': 0, 'skillpoints': 0, 'skills': {}, 'location': ''
};
var item_hooks = {};
var item_infos = {};
var weapon_dmg = {};
var item_groups = {};
var skills_base = {};
var default_skill_cost = 1000;

var done_setup = false;
(function() {
    //Initialization and internals
    window.getv = function(key, defaultv = undefined){
        let v = State.getVar(`$${key}`);
        if (v == undefined || v == null) return defaultv;
        return v;
    };
    window.setupRPG = function(){
    if(!State.getVar("$done_setup_tales") != "true"){
        State.setVar('$focusable', []);
        State.setVar('$focus', '');
        State.setVar('$characters', []);
        State.setVar('$zone_items', {});
        State.setVar('$containers', {});
        State.setVar('$flags', {});
        State.setVar('$zone_flags', {});
        State.setVar('$skill_limit', 4);
        //Default strings
        State.setVar('$msg_noskilltrain', "Can't train a skill you dont have.");
        State.setVar("$done_setup_tales", "true");
    }

    };

    window.tts = function(text){
    // new SpeechSynthesisUtterance object
    let utter = new SpeechSynthesisUtterance();
    utter.lang = 'en-US';
    utter.text = text;
    utter.volume = 0.5;

    // event after text has been spoken
    utter.onend = function() {
        alert('Speech has finished');
    };

    // speak
    window.speechSynthesis.speak(utter);
    };
    window.zoneTagged = function(zone, tag){
    if(zone == "here") zone = State.passage;let p = Story.get(zone);return p.tags.includes(tag); };
    
    window.getFlag = function(k) {
        if(window.getv("flags")[k] != undefined) return window.getv("flags")[k].toString(); return "undefined";
    };
    window.getZoneFlag = function(z, k) {
        if(z == "here") z = State.passage;
        if(window.getv("zone_flags")[z] != undefined && window.getv("zone_flags")[z][k] != undefined) 
            return window.getv("zone_flags")[z][k].toString();
        return "undefined";
    };
    Macro.add('reload', { handler: function(){ Dialog.close(); $(this.output).wiki(`<<goto '${State.passage}'>>`); } });
    window.setFlag = function(k, v) { let f = window.getv("flags", {}); f[k] = v; State.setVar("$flags", f); };
    
    Macro.add('setflag', {
        handler: function(){
            let k = this.args[0];
            let v = this.args[1];
            let f = window.getv("flags", {});
            f[k] = v;
            State.setVar("$flags", f);
    }});
    
    Macro.add('setzoneflag', {
        handler: function(){
            let k = null;
            let v = null;
            let z = null;
            if (this.args.length == 2){
                k = this.args[0];
                v = this.args[1];
                z = State.passage;
            } else if (this.args.length == 3){
                z = this.args[0];
                k = this.args[1];
                v = this.args[2];
            }
            let f = window.getv("zone_flags", {});
            if(f[z] == undefined) f[z] = {};
            f[z][k] = v;
            State.setVar("$zone_flags", f);
    }});
    
    Macro.add('newcharacter', {
        handler: function(){
            let name = this.args.full;
            if(getChar(name) != undefined) return;
            let c = getv('characters', []);
            let newc = JSON.parse(JSON.stringify(template_char));
            newc.name = name;
            c.push(newc);
            State.setVar('$characters', c);
    }});
    Macro.add('getcharprop', {
        handler: function(){
            let name = this.args[0];
            if(name == "self") name == null;
            let t = getChar(name);
            if(t == undefined) return;
            $(this.output).wiki(`${t[this.args[1]]}`);
    }});
    window.getCharProp = function(name, key){
        let t = getChar(name);
        return t[key];
    }
    window.setCharProp = function(name, key, value){
        let t = getChar(name);
        t[key] = value;
    }
    window.defMsg = function(tablekey, defaultmsg){
        let m = State.getVar(`$msg_${tablekey}`);
        if(m != undefined) return defaultmsg;
        else return m;
    };
    
    Macro.add('diag', {
        tags: ['main'],
        handler: function(){
            if (this.args.length != 0) Dialog.setup(this.args.full); 
            else Dialog.setup("Dialog");
            Dialog.wiki(this.payload[0].contents);
            Dialog.open();
        }
    });
    
    Macro.add('qdiag', {
        handler: function(){ 
            name = this.args[0]; let data = this.args[1]; Dialog.setup(name); Dialog.wiki(data); Dialog.open();
        }
    });
    
    Macro.add('defhook', {
        tags: ['main'],
        handler: function(){
            let data = this.payload[0].contents;
            let title = this.args[1];
            if(this.args[2] == 'inv_limiter' && this.args[3] != undefined){
                data = `<<if countPlayerItems("${this.args[0]}") >= ${this.args[3]}>><<notify>>Can't carry it.<</notify>>
<<addtozone 'here' '${this.args[0]}'>><<else>><<setflag 'give_event_pass' 'true'>>
<</if>>`;
            }
            if (item_hooks[this.args[0]] == undefined) item_hooks[this.args[0]] = {};
            item_hooks[this.args[0]][title] = data;
        }
    });
    window.countItems = function(c, i){
        let char = getChar(c);
        var count = 0;
        for(const item of char.inventory){if(item == i) count += 1;}
        return count;
    };
    window.countPlayerItems = function(i){
        let char = getChar();
        var count = 0;
        for(const item of char.inventory){if(item == i) count += 1;}
        return count;
    };
    // Character Control
    window.getChar = function (name = null) {
        if (name == null) name = State.getVar("$focus");  
        let chars = getv('characters', null);
        if(chars == null) return;
        for (var index = 0; index < chars.length; index++){
            let c = chars[index];
            if (c.name == name){  return c;   }
        }
        return;
    };
    window.focusOn = function (name) { 
        State.setVar('$focus', name); 
        let t = getChar(name);
        if(t.location != '' && t.location != State.passage) $.wiki(`<<goto '${t.location}'>>`);
    };
    window.getFocus = function () { return window.getChar(); };
    window.getFocusName = function () { return window.getChar().name; };
    Macro.add('focus', {
        handler: function(){
            window.focusOn(this.args.full);
        }
    });
    window.setLocation = function(char, loc){
        let t = getChar(char);
        if(t != undefined)  
            t.location = loc;
    }
    window.getLocation = function(char){
        let t = getChar(char);
        return t.location;
    }
    Macro.add('getfocus', {
        handler: function(){
            if (this.args.length == 0)
                jQuery(this.output).wiki(window.getFocus()['name']);
            else
                jQuery(this.output).wiki(window.getFocus()[this.args[0]]);
        }
    });
    Macro.add('addfocus', {
        handler: function(){
            let names = State.getVar('$focusable');
            if(names == undefined) names = [];
            if (!names.includes(this.args.full)) names.push(this.args.full);
            State.setVar('$focusable', names);
        }
    });
    Macro.add('removefocus', {
        handler: function(){
            let names = State.getVar('$focusable');
            for (const name of this.args){
                if (names.includes(name)) names.cut(name);
            }
            State.setVar('$focusable', names);
        }
    });
    
    Macro.add('focusmenu', {
        handler:function(){
            let t = State.getVar('$focusable');

            let body = "";

            for (const item of t){
                body += `''${item}'' <<link '[ Switch ]'>><<run Dialog.close()>><<focus ${item}>><</link>> (${getLocation(item)})\n`;

            }
            Dialog.setup(`Switch Character`);
            Dialog.wiki(body);
            Dialog.open();
    }});

    // Stats

    window.takeHealth = function (char, health) {
        let character = window.getChar(char);
        character.health -= health;
        if(character.health < 0) character.health = 0;
        //State.setVar('$character', character);
    };
    
    window.giveHealth = function (char, health) {
        let character = window.getChar(char);
        character.health += health;
        if(character.health > character.healthmax) character.health = character.healthmax;
        //State.setVar('$character', character);
    };
    window.takeEnergy = function (char, energy) {
        let character = window.getChar(char);
        character.energy -= energy;
        if(character.energy < 0) character.energy = 0;
        //State.setVar('$character', character);
    };
    
    window.giveEnergy = function (char, energy) {
        let character = window.getChar(char);
        character.energy += energy;
        if(character.energy > character.energymax) character.energy = character.energymax;
        //State.setVar('$character', character);
    };

    window.getOxygen = function(char = null){
    let c = getChar(char);
    return c.oxygen;
    };
    window.takeOxygen = function (char, oxygen) {
        let character = window.getChar(char);
        character.oxygen -= oxygen;
        if(character.oxygen < 0) character.oxygen = 0;
        State.setVar('$character', character);
    };
    
    window.giveOxygen = function (char, oxygen) {
        let character = window.getChar(char);
        character.oxygen += oxygen;
        if(character.oxygen > 100) character.oxygen = 100;
        State.setVar('$character', character);
    };
    
    window.hasEnergy = function (char, limit) {
        var curen = window.getChar(char);
        console.log(`${curen.energy} == ${limit}`)
        return Number(curen.energy) >= Number(limit);
    };
    
    window.takeDamage = function (char, dmg) {
        let c = window.getChar(char);
        c.health -= dmg;
    };
    Macro.add('takedamage', {
        handler: function(){
        let t = getChar();
        t.health -= this.args[0];
    }});
    Macro.add('takedamagerandom', {
        handler: function(){
        let t = getChar();
        t.health -= random(this.args[0], this.args[1]);
    }});
    
    Macro.add('showhealth', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`HE <progress @value="${t.health}" max="${t.healthmax}"></progress>`);
    }});
    Macro.add('gethealth', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`${t.health}/${t.healthmax}`);
    }});
    window.getPlayerHealth = function(){
    return getChar().health;
    };
    Macro.add('showenergy', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`EN <progress @value="${t.energy}" max="${t.energymax}"></progress>`);
    }});
    Macro.add('getenergy', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`${t.energy}/${t.energymax}`);
    }});
    Macro.add('showoxygen', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`OX <progress @value="${t.oxygen}" max="100"></progress>`);
    }});
    Macro.add('getoxygen', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`${t.oxygen}/100`);
    }});
    Macro.add('takehealth', {});
    Macro.add('takeenergy', {
        handler: function(){
            let character = window.getChar();
            character.energy -= parseInt(this.args[0]);
            if(character.energy < 0) character.energy = 0;
        }
    });
    

    // Inventory
    Macro.add('takemoney', {
        handler: function(){
        let t = getChar();
        t.money -= this.args[0];
        if(t.money < 0) t.money = 0;
    }});
    Macro.add('givemoney', {
        handler: function(){
        let t = getChar();
        t.money += this.args[0];
    }});
    Macro.add('money', {
        handler: function(){
        let t = getChar();
        let s = this.args.full.replace("%", t.money.toString());
        $(this.output).wiki(s);
    }});
    
    Macro.add('defdmg', { handler:function(){ weapon_dmg[this.args[0]] = this.args[1]; } });
    window.getDmg = function(name, deflt = 0){
    if (weapon_dmg[name] == undefined) return deflt;
    return weapon_dmg[name];
    };
    Macro.add('defgroup', {
        handler:function(){
            let g = this.args.shift();
            if(item_groups[g] == undefined) item_groups[g] = [];
            for (const item of this.args){
            item_groups[g].push(item); 
            }
            
        }
    });
    Macro.add('definfo', {
    tags: ['main'],
        handler:function(){
        let text = this.payload[0].contents;
            item_infos[this.args[0]] = text;
        }
    });
    window.hasItemOf = function(group){
        if(item_groups[group] == undefined) return false;
        let c = window.getChar();
        for (const item of c.inventory){ if (item_groups[group].includes(item)) return item; }
        return "";
    };
    window.itemsOf = function(group){
    let r = [];
        if(item_groups[group] == undefined) return r;
        let c = window.getChar();
        for (const item of c.inventory){ if (item_groups[group].includes(item)) r.push(item); }
        return r;
    };
    Macro.add('defconitems', {
        handler:function(){
        var z = window.getv("containers", {});
        var ary = Array.from(this.args);
        var n = ary.shift();
        z[n] = ary;	
        State.setVar("$containers", z);
    }});
    
    Macro.add('conitems', {
        handler:function(){
            let data = window.getv("containers", {});
            $(this.output).wiki(data[this.args.full].join(", "));
    }});
    
    Macro.add('addtocontainer', {
        handler:function(){
            let n = this.args.shift();
            var z = window.getv("containers", {});
            if(z[n] == undefined) z[n] = [];
            for (const item of this.args){
                z[n].push(item);
            }
            State.setVar("$containers", z);
    }});
    
    Macro.add('removefromcontainer', {
        handler:function(){
            let n = this.args.shift();
            var z = window.getv("containers", {});
            if(z[n] == undefined) z[n] = [];
            for (const item of this.args){
                z[n].cut(item);
            }
            State.setVar("$containers", z);
    }});
    
    Macro.add('initzoneitems', {
        handler:function(){
        var n = State.passage;
        if(visited(n) == 1){
            var z = window.getv("zone_items", {});
            var ary = Array.from(this.args);
            
            z[n] = ary;
            State.setVar("$zone_items", z);
        }
    }});
    
    Macro.add('defzoneitems', {
        handler:function(){
        var z = window.getv("zone_items", {});
        var ary = Array.from(this.args);
        var n = ary.shift();
        z[n] = ary;
        State.setVar("$zone_items", z);
    }});
    
    Macro.add('addtozone', {
        handler:function(){
            let n = this.args.shift();
            if(n == "here") n = State.passage;
            var z = window.getv("zone_items", {});
            if(z[n] == undefined) z[n] = [];
            for (const item of this.args){
                z[n].push(item);
            }
            
            State.setVar("$zone_items", z);
    }});
    
    Macro.add('removefromzone', {
        handler:function(){
            let n = this.args.shift();
            if(n == "here") n = State.passage;
            var z = window.getv("zone_items", {});
            if(z[n] == undefined) z[n] = [];
            for (const item of this.args){
                z[n].cut(item);
            }
            
            State.setVar("$zone_items", z);
    }});
    
    Macro.add('zoneitems', {
        handler:function(){
            let n = this.args[0];
            if(n == "here" || n == undefined) n = State.passage;
            let data = window.getv("zone_items", {});
            if(data[n] != undefined){
                let body = [];
                for(const item of data[n]){
                    body.push(`<<link '${item}'>>
                    <<giveitem '${item}'>><<removefromzone 'here' '${item}'>><<reload>>
                    <</link>>`);
                }
                $(this.output).wiki(body.join(", "));
            }
                
    }});
    
    window.hasItem = function(target, item){
        let c = window.getChar(target);
        return (c.inventory.includes(item));
    };
    window.playerHasItem = function(item){
        let c = window.getChar();
        return (c.inventory.includes(item));
    };
    
    window.zoneHasItem = function(zone, item){
        if(zone == "here") zone = State.passage;
        let data = window.getv("zone_items", {});
        if(data[zone] == undefined) return false;
        if(data[zone].includes(item)) return true;
        return false;
    };
    window.zoneHasItems = function(zone){
        if(zone == "here") zone = State.passage;
        let data = window.getv("zone_items", {});
        if(data[zone] == undefined) return false;
        if(data[zone].length > 0) return true;
        return false;
    };
    window.conHasItem = function(c, item){
        let data = window.getv("containers", {});
        if(data[c] == undefined) return false;
        if(data[c].includes(item)) return true;
        return false;
    };
    window.conHasItems = function(c){
        let data = window.getv("containers", {});
        if(data[c] == undefined) return false;
        if(data[c].length > 0) return true;
        return false; 
    };
    
    window.takeItem = function(char, name){
        let t = getChar(char);
        t.inventory.cut(name);
    }
    Macro.add('takeitem', {
        handler:function(){
            let t = null;
            let i = null;
            
            if(this.args.length == 0)
                return this.error("No arguments supplied to takeitem.");
            
            else if(this.args.length == 1){
                t = window.getFocus();
                i = this.args[0];
            }
            else{
                t = window.getChar(this.args[0]);
                i = this.args[1];
            }
            
            t.inventory.cut(i);
            if(!this.args[1] != "silent") 
                $(this.output).wiki(`@@.fade-in-out;${i} was removed from your inventory.@@`);
            return 1;
        }});
    
    window.giveItem = function(char, n){
        let t = getChar(char);
        t.inventory.push(i);
    };
    Macro.add('giveitem', {
        handler:function(){
            let t = null;
            let i = null;
            window.setFlag("give_event_pass", "");
            if(this.args.length == 0)return this.error("No arguments supplied to takeitem.");
            
            else if(this.args.length == 1){
                t = window.getFocus();
                i = this.args[0];
            }
            else{
                t = window.getChar(this.args[0]);
                i = this.args[1];
            }

            if(item_hooks[i] != undefined && item_hooks[i]['give'] != undefined){
                $(this.output).wiki(item_hooks[i]['give']);
                if(getFlag("give_event_pass") == "true"){
                    t.inventory.push(i);
                    if(!this.args[1] != "silent") $(this.output).wiki(`@@.fade-in-out;${i} was added to your inventory.@@`);
                }
                setFlag("give_event_pass", undefined);
            } else {
                t.inventory.push(i);
                if(!this.args[1] != "silent") 
                    $(this.output).wiki(`@@.fade-in-out;${i} was added to your inventory.@@`);
            }

        
            return 1;
        }});
    
    Macro.add('inventory', {
        handler:function(){
            let t = null;
            let body = "";
            
            if(this.args.length == 0)  t = window.getFocus();
            else                       t = window.getChar(this.args.full);
            
            for (const item of t.inventory){
                body += `<<link '[Drop]'>><<closediag>><<takeitem '${item}'>><<addtozone 'here' '${item}'>><<reload>>\
                <<inventory>><</link>>`;
                body += `''${item}''`;
                if(item_hooks[item] != undefined && item_hooks[item]['inventory'] != undefined){
                    let i = item_hooks[item]['inventory'];
                    body += ` <<link '[Use]'>><<closediag>>${i}<</link>>`;
                }

            if(item_infos[item] != undefined){ body += ` <<message '?' '${item}'>>${item_infos[item]}<</message>>`; }
                
                body += "\n";
            }
            Dialog.setup(`${t.name}'s Inventory`);
            Dialog.wiki(body);
            Dialog.open();
        }});


    // Skills
    window.skillCheck = function(character, skill, level){
        let char = getChar(character);
        if (char == null) return false;
        if (char.skills[skill] == undefined) return false;
        if (char.skills[skill] >= level) return true;
        return false;
    };
    
    window.getSkillLevel = function(character, skill){
        let char = getChar(character);
        if (char == null) return -1;
        if (char.skills[skill] == undefined) return -1;
        return char.skills[skill];
    };
    
    Macro.add('defskill', { handler: function(){ skills_base[this.args[0]] = parseInt(this.args[1]); } });
    
    Macro.add('givesp', { handler: function(){ let char = getChar(); char.skillpoints += parseInt(this.args.full); } });

    Macro.add('skills', {
    handler: function(){
        var body = `Your Skillpoints available: ${getChar().skillpoints}\n\n`;
        for(var s of Object.keys(skills_base)){
            let v = skills_base[s];
            let lvl = getSkillLevel(null, s);
            body += `<<if canBuy('${s}')>><<button "+">><<run buySkill('${s}')>><<closediag>><<reload>><<skills>><</button>> <</if>>Lv${lvl} ${s} (${v*lvl})\n`;
        }

        Dialog.setup(`Skills`);
            Dialog.wiki(body);
            Dialog.open();
    }
    });

    window.canBuy = function(name){
    let c = getChar();
    let cost = skills_base[name]*c.skills[name];
    if(cost == undefined) cost = default_skill_cost;
    if(c.skillpoints >= cost && c.skills[name] < State.getVar("$skill_limit")){
        return true;
    }else return false;
    };

    window.buySkill = function(name){
    let c = getChar();
    let cost = skills_base[name];
    if(cost == undefined) cost = default_skill_cost;
    if(c.skillpoints >= cost){
        if(c.skills[name] < State.getVar("$skill_limit")){
            c.skillpoints -= cost*c.skills[name];
            c.skills[name] += 1;
            
        }
            
    }
    };

    Macro.add('closediag', {
    handler: function(){
            Dialog.close();
    }
    });
    
    Macro.add('skillcheck', {
        tags: ['main', 'failedcheck'],
        handler: function(){
            if(window.skillCheck(null, this.args[0], parseInt(this.args[1]))){
                $(this.output).wiki(this.payload[0].contents);
            }else if(this.payload[1] != null && this.payload[1] != undefined){$(this.output).wiki(this.payload[1].contents);}
        }
    });
    
    Macro.add('trainskill', {
        handler: function(){
            let t = null;
            let i = null;
            
            if(this.args.length == 0) return this.error("No arguments supplied to trainskill.");
            
            else if(this.args.length == 1){t = window.getFocus(); i = this.args[0];}
            else{t = window.getChar(this.args[0]);i = this.args[1];}

        if (i == 'all'){
            for(const skill of Object.keys(skills_base)){ if (t.skills[skill] == undefined) t.skills[skill] += 1; }
        }else { if (t.skills[i] == undefined) t.skills[i] += 1; }           
            return 1;
        }
    });
    
    Macro.add('forcetrainskill', {
        handler: function(){
            let t = null;
            let i = null;
            
            if(this.args.length == 0) return this.error("No arguments supplied to trainskill.");
            
            else if(this.args.length == 1){ t = window.getFocus(); i = this.args[0]; }
            else { t = window.getChar(this.args[0]); i = this.args[1]; }

        if (i == 'all'){
            for(const skill of Object.keys(skills_base)){ if (t.skills[skill] == undefined) t.skills[skill] = 1; }
        }else { if (t.skills[i] == undefined) t.skills[i] = 1; }           
            return 1;
        }
    });

    window.goals = function(){
        return getv("goals", {});
    };
    window.notes = function(){
        return getv("notes", []);
    };
    // Notes and goals
    Macro.add('goals', {
        handler: function(){
            let goals = window.goals();
            console.log(goals);
            let body = "";
            let completed = 0;
            if(Object.keys(goals) == 0){
                body = "None."
            } else{
                for (const key of Object.keys(goals)){
                    let item = goals[key];
                    if(item.active){ body += "<hr>"; body += `''${item.body}''`; } 
                    else completed += 1;
                }
            }

            body += "<hr>";
            
            if (completed >= 1) 
                body += `View <<link '${completed} completed goals'>><</link>>`;
            Dialog.setup(`Goals`);
            Dialog.wiki(body);
            Dialog.open();
        }
    });

    window.editNote = function(oldbody, newbody){
        oldbody = State.getVar(oldbody);
        newbody = State.getVar(newbody);
        newbody = newbody.replace(/[\r\n]/g, "<br/>");
        newbody = newbody.replace(`"`, "'");
        let notes = window.notes();
        for (var i = 0;i<=notes.length;i++){ 
            if(notes[i] == oldbody){ 
                notes[i] = newbody; break; 
            } 
        }
        State.setVar("$notes", notes);
    };
    
    Macro.add('notes', {
        handler: function(){
        let notes = window.notes();
            let body = `<<button 'New Note'>>
                <<diag Create>>\
                <<textarea '$newnote' ''>>
                <<button 'Send'>><<addnote>>$newnote<</addnote>>
                <<closediag>><<notes>><</button>><</diag>>
                <</button>>\n`;

            for (const item of notes){
            body += "<hr>";
            body += `''${item}''`;
                body += `\n<<button 'Delete'>><<deletenote>>${item}<</deletenote>><<closediag>><<notes>><</button>>`;
            body += ` <<button 'Edit'>><<set $oldnote to "${item}">>
                <<closediag>><<diag Edit>>\
                <<textarea '$newnote' "${item}">>
                <<button 'Send'>><<run editNote('$oldnote', '$newnote')>>
                <<closediag>><<notes>><</button>><</diag>><</button>>\n`;
            }
        body += "<hr>";
            Dialog.setup(`Notes`);
            Dialog.wiki(body);
            Dialog.open();
    }
    });
    Macro.add('addnote', {
        tags: ['main'], handler: function(){
        let notes = window.notes();
        let content = this.payload[0].contents;
        
        if(content.startsWith("$")) content = State.getVar(content);
        content = content.replace(/[\r\n]/g, "<br />");
        notes.push(content);
        if(!this.args.full != "silent") $(this.output).wiki("@@.fade-in-out;A note was added to your datavault.@@");
        State.setVar("$notes", notes);
    }
    });
    
    Macro.add('deletenote', { tags: ['main'], handler: function(){ let notes = window.notes();notes.cut(this.payload[0].contents);
                                            State.setVar("$notes", notes);} });
    
    Macro.add('defgoal', {
        tags: ['main'], handler: function(){
        let goals = window.goals();
        goals[this.args[0]] = {"body": this.payload[0].contents, "id": this.args[0], "active": true};
        if(!this.args[1] != "silent") $(this.output).wiki("@@.fade-in-out;A new goal was added to your datavault.@@");
        State.setVar("$goals", goals);
    }
    });
    Macro.add('completegoal', {
        handler: function(){
        let goals = window.goals();
        goals[this.args[0]]["active"] = false;
        if(!this.args[1] != "silent") $(this.output).wiki("@@.fade-in-out;Goal status updated.@@");
        State.setVar("$goals", goals);
    }
    });
    Macro.add('editgoal', {
        tags: ['main'], handler: function(){
        let goals = window.goals();
        
        goals[this.args[0]]["body"] = this.payload[0].contents;
        if(!this.args[1] != "silent") $(this.output).wiki("@@.fade-in-out;Goal status updated.@@");
        State.setVar("$goals", goals);
    }
    });
    Macro.add('deletegoal', { handler: function(){ let goals = window.goals(); delete goals[this.args[0]];
                                State.setVar("$goals", goals); } });



    // Crafting system
    // On craft, do an event hook for item being crafted 
    Macro.add('addblueprint', {
        handler: function(){
            let creatable = this.args.shift()
            let ingredients = this.args;
            let blueprints = getv("blueprints", {});
            blueprints[creatable] = ingredients;
            $(this.output).wiki(`@@.fade-in-out;You learned to create ${creatable}.@@`);
            State.setVar("$blueprints", blueprints);
        }
    });
    
    window.checkValidCraft = function(ls) {
        var passes = 0;
        for(const ing of ls){
            if(isNaN(ing.split(" ")[0])){
                //static exist check
                if(playerHasItem(ing)) passes += 1;
            }else{
                //number of ingredients
                let a = ing.split(" ");
                let countreq = parseInt(a.shift());
                let name = a.join(" ");
                let c = getChar();
                var counthas = 0;
                for (const item of c.inventory){
                    if(item == name) {
                        counthas += 1;
                    }
                        
                }
                if(counthas >= countreq) passes += 1;
            }
        }
        return (passes == ls.length)
    }
    
    window.takeItemsAdv = function(ls) {
        for(const ing of ls){
            if(isNaN(ing.split(" ")[0])){
                if(playerHasItem(ing)) takeItem(null, ing);
            }else{
                //number of ingredients
                let a = ing.split(" ");
                let countreq = parseInt(a.shift());
                let name = a.join(" ");
                var done = 0;
                while (done < countreq){
                    takeItem(null, name);
                    done += 1;
                }
            }
        }
    }
    
    Macro.add('takeitemsadv', {
        handler:function(){
            for(const ing of this.args){
                if(isNaN(ing.split(" ")[0])){
                    if(playerHasItem(ing)) takeItem(null, ing);
                }else{
                    //number of ingredients
                    let a = ing.split(" ");
                    let countreq = parseInt(a.shift());
                    let name = a.join(" ");
                    let c = getChar();
                    var done = 0;
                    while (done < countreq){
                        takeItem(null, name);
                        done += 1;
                    }
                    if(counthas >= countreq) passes += 1;
                }
            }
            return (passes == ls.length)
        }
    });
    
    Macro.add('takeitemsforcraft', {
        handler:function(){
            let t = getv('blueprints', {});
            if(t[this.args.full] != undefined){
               takeItemsAdv(t[this.args.full]);
            }
        }
    });
    
    Macro.add('gather', {
        handler:function(){
            let items = this.args;
            let energy = 10;
            if(!isNaN(items[0])) energy = parseInt(items.shift())
            if(hasEnergy(null, energy)){
                var item = items[Math.floor(Math.random() * items.length)];
                $(this.output).wiki(`<<takeenergy ${energy}>><<giveitem '${item}'>><<reload>><<notify>>+${item}.\n-${energy} energy.<</notify>>`); 
            } else {
                $(this.output).wiki(`<<notify>>Not enough energy to do this.<</notify>>`);   
            }

        }
    });
    
    Macro.add('crafting', {
        handler:function(){
            let t = getv('blueprints', {});
            let body = "";
            if(Object.keys(t).length == 0){
                body = "None."
            }else{
                for (const item of Object.keys(t)){
                    body += `''${item}''\n - ${t[item].join(", ")}`;
                    if(checkValidCraft(t[item])){
                        body += `\n<<button 'Create'>>
                        <<takeitemsforcraft ${item}>>
                        <<giveitem '${item}'>>
                        <<reload>>
                        <<closediag>>
                        <<crafting>>
                        <</button>>`;
                    }
                    body += "\n\n";
                }
            }

            
            Dialog.setup(`Craft`);
            Dialog.wiki(body);
            Dialog.open();
    }});
    
    // Combat system
    Macro.add('defencounter', { handler: function(){ } });
    Macro.add('espawn', { handler: function(){ } });
    Macro.add('espawnfromchar', { handler: function(){ } });
    Macro.add('esethealth', { handler: function(){ } });
    Macro.add('etakehealth', { handler: function(){ } });
    Macro.add('egivehealth', { handler: function(){ } });
    Macro.add('esetalliance', { handler: function(){ } });
    Macro.add('eaddaction', { handler: function(){ } });
})();
