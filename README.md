# Tales
A work-in-progress RPG functionality library.
Still in early days, but the idea is a library that adds a bunch of features
to Twine that allows for deeper mechanics and systems, through scripting and macros.

Demos are available, games built using this library: (note, heavily WIP)\
https://codedmind.gitlab.io/winter/ \
https://codedmind.gitlab.io/dxd/

```
:: StoryInit
Setup backend variables
<<run setupRPG()>>

Define hooks for items.
They are assigned by itemname and hookname.
Default `inventory` hook is triggered when used from the built-in inventory screen.
Whatever is contained between the tags is what gets run.

<<defhook 'Knife of Physicality' 'inventory'>>
<<goto [[Stab Zone]]>>
<</defhook>>

<<defhook 'Fork of Magic' 'inventory'>>
<<goto [[Fork Zone]]>>
<</defhook>>

Groups are ways of defining functionality of items within the world.
By adding these items to the `melee` group, the javascript function `hasItemOf(grp)` returns the first 
item from that group that the focus character has, or an empty string if they have none.
<<defgroup 'melee' 'Knife of Physicality' 'Fork of Magic'>>

Zone items are an optional feature to define a list of items that exists within each passage, or "zone" as referred to internally.
Giving a passage items will let you automate some basic item gathering functionality when used alongside other functions that access this list.
Alongside this setter, there is the addtozone and removefromzone macros, with the format of;
addto/removefromzone 'name' 'item list'...
<<defzoneitems 'Lobby' 'Wine Bottle' 'Liquor Bottle' 'Crowbar' 'Binoculars'>>

:: StoryCaption
`here` is a special keyword used mostly when a javascript function takes a zone/passage for input.
It auto replaces with the currently active passage name.
In this example, zoneHasItems checks the variable for zoneitems as defined above, and returns true if the list is not empty, and zoneitems macro produces a clickable list, which lets players take items out of the zone, and adds them to player inventory.

<<if zoneHasItems('here')>>\
There are items here:
<<zoneitems>>
<</if>>

:: Start
Create character data
<<newcharacter Steve>>
<<newcharacter Kloe>>

Choose who to "focus" on, e.i. who the macro selections default to, basically what character we're "playing as".
<<focus Steve>>

Add focus adds these names to the Focus list, a built-in menu for changing characters.
<<addfocus Steve>>
<<addfocus Kloe>>

:: Lobby

getfocus macro gets who we're focused on, arg supplied is what key of the character to get.
You are <<getfocus 'name'>> with <<getfocus 'health'>> health.
showhealth macro displays health in a pleasant bar format
<<showhealth>>

getFocus global javascript function works like the macro
This is basically a check to see who we're playing as.
<<if getFocus('name') == 'Steve'>>\
'Kloe': Hey. <<link 'Become Kloe'>><<focus Kloe>><<goto [[Lobby]]>><</link>>
<</if>>\
<<if getFocus('name') == 'Kloe'>>\
Steve: Hey. <<link 'Become Steve'>><<focus Steve>><<goto [[Lobby]]>><</link>>
<</if>>\



This is the lobby, there is a spike.
takeDamage is a global JS function to damage a character (shocking)
format is takeDamage(character_name, damage)
Macro coming soon (tm)
<<link 'Hurt me'>><<run takeDamage(getFocusName(), 10)>><</link>>

giveitem is a macro to add an item to the current focus'd player

<<link 'Take Knife'>><<giveitem 'Knife'>><</link>>
takeitem is giveitem but in reverse, removes an item (doesnt work yet
<<link 'Throw Knife'>><<takeitem 'Knife'>><</link>>

if a second argument is supplied for give/takeitem, it uses arg 1 as the character target, arg 2 as the item
<<link 'Send Fork to not-Steve'>><<giveitem 'Kloe' 'Fork of Magic'>><</link>>

macro shortcut to display a popup inventory
<<link 'Show Inventory'>><<inventory>><</link>>

macro to check if you have an item, same format as give/take
<<link 'Stab Cushion'>>\
<<if hasItem(getFocusName(), 'Knife of Physicality')>><<goto [[Stab Zone]]>><<else>><<goto [[UnStab Zone]]>><</if>>
<</link>>
```

## TODO
Not a complete list, will change over time.
   - [ ] Way of characters and items "existing" in specific passage
	 - [ ] In the passage-ready event(?) check through characters/obj to find which have their location var set to it 
	   - [ ] Give a link to the objects `use-world` event
	   - [ ] Alterative idea for showing objects, macro that provides a list, like inventory, but not
   - [-] Change the item using system to be more like an events system
	 - [X] Object of item names and event sub-objects
	 - [X] Macro to add events
	 - [ ] Macro for triggering events
	   - [ ] <<hook 'item' 'hook'>>
   - [-] Switchable characters
	 - [X] Seems to work, keep testing in other scenarios
	 - [-] Menu for switching characters
	   - [X] State variable list for controlling which characters populate it
	   - [ ] When object locations is implemented, make it "change" passage to where the new character is
   - [-] Items
     - [ ] Wearables
	 - [X] Usage
	 - [ ] Crafting
	 - [ ] Helper macro for trading items between characters
   - [ ] Skills
	 - [ ] Checks
	 - [ ] Leveling
   - [ ] Dialog
   - [ ] Combat
   - [ ] Quest log
   - [ ] Notes
   - [ ] Playing card library, with images (Maybe seperate, or integrate with items)
