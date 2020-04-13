/*
Move Gathering in to this system once inventory is solidified

*/

(function(){
	window.setupRPG = function(){
		State.setVar('$template_char', {'health': 100, 'healthmax': 100});
		State.setVar('$item_hooks', {});
	};
	window.showEnergy = function(char, ){
		window.getChar(char)
		$(this.output).wikifier(`Energy: <progress @value="$character.en" max="100"></progress> ($character.en / $character.enmax)`);
	};

	window.takeEnergy = function (char, energy) {
		let character = window.getChar(char);
		character.en -= energy;
		State.setVar('$character', character);
	};
	
	window.hasEnergy = function (char, limit) {
		var curen = window.getChar(char);
		return Number(curen) >= Number(limit);
	};
	
	window.takeDamage = function (char, dmg) {
		/*let chars = State.getVar('$all_characters');
		console.log(chars);
		for (const cv of Object.keys(chars)){
			let c = chars[cv];
			if(chars[cv].name == char){
				chars[cv].health -= dmg;
			}
			}*/
		let c = window.getChar(char);
		console.log("Getchar got");
		console.log(c);
		c.health -= dmg;

	};
	window.showHealth = function(char){
		let t = window.getChar(char);
		State.setVar("_c", t);
		$(this.output).wikifier(`Energy: <progress @value="_c.health" max="100"></progress> (_c.health / _c.healthmax)`);
	};	

	
	window.focusControl = function (name) {
		State.setVar('$focus', name);
	};
	
	window.getChar = function (name) {
		let chars = State.getVar('$all_characters');
		console.log(chars);
		for (const cv of Object.keys(chars)){
			console.log(cv);
			let c = chars[cv];
			if (c.name == name){
				return c;
			}
		}
		return undefined;
	};
	
	window.getFocus = function (key) {
		let chars = State.getVar('$all_characters');
		console.log(chars);
		let fc = State.getVar("$focus");
		for (const cv of Object.keys(chars)){
			console.log(cv);
			let c = chars[cv];
			if (c.name == fc){
				if (key == undefined)
					return c;
				else
					return c[key];
			}
		}
		return undefined;
	};

	window.hasItem = function(target, item){
		let c = window.getChar(target);
		return (c.inventory.includes(item));
	};
	
	window.defItemUse = function(target, fn){
		let items = State.getVar('$items_use');

		items[target] = fn;
	};
		
	
	Macro.add('skillcheck', {});
	Macro.add('trainskill', {});

	Macro.add('defhook', {
		tags: ['main'],
		handler: function(){
			console.log(this.payload);
			let data = this.payload[0].contents;
			let items = State.getVar('$item_hooks');
			let title = this.args[1];

			if (items[this.args[0]] == undefined) items[this.args[0]] = {};
			items[this.args[0]][title] = data;
			
			State.setVar('$item_hooks', items);
			console.log(items);
		}
	});
	
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
			
			t.inventory.push(i);
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

			for (const item of t.inventory){
				body += `''${item}''`;
				if(State.getVar('$item_hooks')[item]['inventory'] != undefined){
					let i = State.getVar('$item_hooks')[item]['inventory'];
					body += ` <<link '[#]'>><<run Dialog.close()>>${i}<</link>>`;
				}
				body += "\n";
			}
			Dialog.setup(`${t.name}'s Inventory`);
			Dialog.wiki(body);
			Dialog.open();
		}});

	
	Macro.add('gather', {});
	Macro.add('focus', {
		handler: function(){
			window.focusControl(this.args.full);
		}
	});
	
	Macro.add('getfocus', {
		handler: function(){
			if (this.args.length == 0)
				jQuery(this.output).wiki(window.getFocus('name'));
			else
				jQuery(this.output).wiki(window.getFocus(this.args[0]));
		}
	});
	
	Macro.add('showhealth', {handler: function(){
		let t = null;

		if(this.args.length == 0)
			t = window.getFocus();	
			
		else
			t = window.getChar(this.args.full);
		$(this.output).wiki(`Energy: <progress @value="${t.health}" max="${t.healthmax}"></progress> (${t.health} / ${t.healthmax})`);
	}});
	Macro.add('showenergy', {});
	Macro.add('takehealth', {});
	Macro.add('takeenergy', {});
	
	Macro.add('newcharacter', {
		handler:function(){
			let name = this.args.full;
			let tmp = State.getVar('$template_char');
			let c = State.getVar('$all_characters');
			console.log(c);
			if (c == undefined){c = {};}

			let newc = {};
			tmp.name = name;
			tmp.inventory = [];
			for (const k of Object.keys(tmp)){
				newc[k] = tmp[k];
			}
			newc.inventory = [];
			State.setVar(`$${name}`, newc);
			c[name] = newc;
			State.setVar('$all_characters', c);
			jQuery(this.output).wiki(`new ${newc.name} ${newc.health} ${c.length}`);

		}});
})();	
