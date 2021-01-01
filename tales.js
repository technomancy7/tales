Array.prototype.cut = function(target){ this.splice (this.indexOf(target), 1); };

var template_char = {'health': 100, 'healthmax': 100, "energy": 100, "energymax": 100, "oxygen": 100,'inventory': [], 'skills': {} };
var item_hooks = {};
(function(){
    //Initialization and internals
    window.getv = function(key, defaultv = undefined){
        let v = State.getVar(`$${key}`)
        if (v == undefined || v == null) return defaultv;
        return v;
    }
    window.setupRPG = function(){
        State.setVar('$focusable', []);
        State.setVar('$focus', '');
        State.setVar('$characters', []);
        State.setVar('$zone_items', {});
        //Default strings
        State.setVar('$msg_noskilltrain', "Can't train a skill you dont have.");
    };
    
    Macro.add('newcharacter', {
        handler: function(){
            let name = this.args.full;
            console.log("template")
            console.log(template_char)
            let c = State.getVar('$characters');
            if(c == undefined) c = []
            
            let newc = JSON.parse(JSON.stringify(template_char));
            newc.name = name;
            console.log(c)
            c.push(newc);
            State.setVar('$characters', c);
    }});
    
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
            console.log("Payload:")
            console.log(this.payload[0].contents)
            let data = this.payload[0].contents;
            console.log(data);
            let title = this.args[1];
            if (item_hooks[this.args[0]] == undefined) item_hooks[this.args[0]] = {};
            item_hooks[this.args[0]][title] = data;
            console.log(item_hooks)
        }
    });
    
    // Character Control
    window.getChar = function (name = null) {
        if (name == null) name = State.getVar("$focus");  
        let chars = State.getVar('$characters');
        for (var index = 0; index < chars.length; index++){
            let c = chars[index];
            if (c.name == name){  return c;   }
        }
        return undefined;
    };
    window.focusOn = function (name) { State.setVar('$focus', name); };
    window.getFocus = function () { return window.getChar(); };
    
    Macro.add('focus', {
        handler: function(){
            window.focusOn(this.args.full);
        }
    });
    
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
            if(names == undefined) names = []
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
                body += `''${item}'' <<link '[ Switch ]'>><<run Dialog.close()>><<focus ${item}>><</link>>\n`;

            }
            Dialog.setup(`Switch Character`);
            Dialog.wiki(body);
            Dialog.open();
    }});

    // Stats
    window.takeEnergy = function (char, energy) {
        let character = window.getChar(char);
        character.energy -= energy;
        if(character.energy < 0) character.energy = 0;
        State.setVar('$character', character);
    };
    
    window.giveEnergy = function (char, energy) {
        let character = window.getChar(char);
        character.energy += energy;
        if(character.energy > 100) character.energy = 100
        State.setVar('$character', character);
    };
    
    window.hasEnergy = function (char, limit) {
        var curen = window.getChar(char);
        return Number(curen) >= Number(limit);
    };
    
    window.takeDamage = function (char, dmg) {
        let c = window.getChar(char);
        c.health -= dmg;
    };
    Macro.add('showhealth', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`Health: <progress @value="${t.health}" max="${t.healthmax}"></progress> (${t.health} / ${t.healthmax})`);
    }});
    Macro.add('showenergy', {
        handler: function(){
        let t = null;

        if(this.args.length == 0)
            t = window.getFocus();
        else
            t = window.getChar(this.args.full);
        $(this.output).wiki(`Energy: <progress @value="${t.energy}" max="${t.energymax}"></progress> (${t.energy} / ${t.energymax})`);
    }});
    Macro.add('takehealth', {});
    Macro.add('takeenergy', {});
    

    // Inventory
    window.hasItem = function(target, item){
        let c = window.getChar(target);
        return (c.inventory.includes(item));
    };
    window.playerHasItem = function(item){
        let c = window.getChar();
        return (c.inventory.includes(item));
    };
    Macro.add('defzoneitems', {
        handler:function(){
        var z = window.getv("zone_items", {})
        var ary = Array.from(this.args)
        var n = ary.shift()
        z[n] = ary;
        State.setVar("$zone_items", z)
    }});
    Macro.add('zoneitems', {
        handler:function(){
            let data = window.getv("zone_items", {});
            
            $(this.output).wiki(data[this.args.full].join(", "));

    }});
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
            return 1;
        }});
    
    Macro.add('giveitem', {
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
            console.log(`t ${t}`);
            console.log(t);
            t.inventory.push(i);
            return 1;
        }});
    
    Macro.add('inventory', {
        handler:function(){
            let t = null;
            
            if(this.args.length == 0)
                t = window.getFocus();
            else
                t = window.getChar(this.args.full);
            
            let body = "";
            console.log("Hooks:");
            console.log(item_hooks);
            for (const item of t.inventory){
                body += `''${item}''`;
                if(item_hooks[item] != undefined && item_hooks[item]['inventory'] != undefined){
                    let i = item_hooks[item]['inventory'];
                    body += ` <<link '[#]'>><<run Dialog.close()>>${i}<</link>>`;
                }
                body += "\n";
            }
            Dialog.setup(`${t.name}'s Inventory`);
            Dialog.wiki(body);
            Dialog.open();
        }});


    // Skills
    window.skillCheck = function(skill, level){
        let char = window.getFocus();
        if (char == undefined) return false;
        if (char.skills[skill] == undefined) return false;
        if (char.skills[skill] < level) return false;
        return true;
    };
    
    window.skillCheckOther = function(character, skill, level){
        let char = window.getChar(character);
        if (char == undefined) return false;
        if (char.skills[skill] == undefined) return false;
        if (char.skills[skill] < level) return false;
        return true;
    };
    
    Macro.add('skillcheck', {
        tags: ['main'],
        handler: function(){
            if(window.skillCheck(this.args[0], this.args[1])){
                let data = this.payload[0].contents;
                $(this.output).wiki(data);
            }
        }
    });
    
    Macro.add('trainskill', {
        handler: function(){ //need to come up with a decent algorithm for progression automation
            let t = null;
            let i = null;
            
            if(this.args.length == 0)
                return this.error("No arguments supplied to trainskill.");
            
            else if(this.args.length == 1){
                t = window.getFocus();
                i = this.args[0];
            }
            else{
                t = window.getChar(this.args[0]);
                i = this.args[1];
            }

            if (t.skills[i] == undefined){
                $(this.output).wiki(window.defMsg('noskilltrain', 'No skill to train.'));
            }else{
                t.skills[i] += 1;
                window.defMsg(`${i} increased to ${t.skills[i]}.`);
            }
            return 1;
        }
    });
    
    Macro.add('forcetrainskill', {
        handler: function(){ //need to come up with a decent algorithm for progression automation
            let t = null;
            let i = null;
            
            if(this.args.length == 0)
                return this.error("No arguments supplied to trainskill.");
            
            else if(this.args.length == 1){
                t = window.getFocus();
                i = this.args[0];
            }
            else{
                t = window.getChar(this.args[0]);
                i = this.args[1];
            }

            if (t.skills[i] == undefined) t.skills[i] = 0;
            t.skills[i] += 1;
            
            window.defMsg(`${i} increased to ${t.skills[i]}.`);
            return 1;
        }
    });
    


    
    Macro.add('gather', {});




})();	
