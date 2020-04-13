# Tales
A work-in-progress RPG functionality library.
Still in early days, but the idea is a library that adds a bunch of features
to Twine that allows for deeper mechanics and systems, through scripting and macros.

```
:: StoryInit
Setup backend variables
<<run setupRPG()>>

Define hooks for items.
They are assigned by itemname and hookname.
Default `inventory` hook is triggered when used from the built-in inventory screen.
Whatever is contained between the tags is what gets run.

<<defhook 'Knife' 'inventory'>>
<<goto [[Stab Zone]]>>
<</defhook>>

<<defhook 'Fork of Magic' 'inventory'>>
<<goto [[Fork Zone]]>>
<</defhook>>

:: Start
Create character data
<<newcharacter Steve>>
<<newcharacter Kloe>>

Choose who to "focus" on, e.i. who the macro selections default to, basically what character we're "playing as".
<<focus Steve>>


:: Lobby

getfocus macro gets who we're focused on, arg supplied is what key of the character to get.
You are <<getfocus 'name'>> with <<getfocus 'health'>> health.
showhealth macro displays health in a pleasant bar format
<<showhealth>>

getFocus global javascript function works like the macro
This is basically a check to see who we're playing as.
<<if getFocus('name') == 'Steve'>>\
'Kloe': Hey. <<link 'Become 'Kloe'>><<focus 'Kloe'>><<goto [[Lobby]]>><</link>>
<</if>>\
<<if getFocus('name') == 'Kloe'>>\
Steve: Hey. <<link 'Become Steve'>><<focus Steve>><<goto [[Lobby]]>><</link>>
<</if>>\



This is the lobby, there is a spike.
takeDamage is a global JS function to damage a character (shocking)
format is takeDamage(character_name, damage)
Macro coming soon (tm)
<<link 'Hurt me'>><<run takeDamage(getFocus('name'), 10)>><</link>>

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
<<if hasItem(getFocus('name'), 'Knife')>><<goto [[Stab Zone]]>><<else>><<goto [[UnStab Zone]]>><</if>>
<</link>>
```

## TODO
Not a complete list, will change over time.
- [ ] Way of characters and items "existing" in specific passage
 - [ ] In the passage-ready event(?) check through characters/obj to find which have their location var set to it
   - [ ] Give a link to the objects `use-world` event
- [ ] Change the item using system to be more like an events system
 - [x] Object of item names and event sub-objects
 - [x] Macro to add events
 - [ ] Macro for triggering events
   - [ ] `<<hook 'item' 'hook'>>`
- [ ] Switchable characters
 - [ ] Seems to work, keep testing in other scenarios
 - [ ] Menu for switching characters
   - [ ] State variable list for controlling which characters populate it
- [ ] Items
 - [ ] Wearables
 - [X] Usage
 - [ ] Crafting
 - [ ] Helper macro for trading items between characters
- [ ] Skills
 - [ ] Checks
 - [ ] Leveling
- [ ] Combat
- [ ] Dialog
- [ ] Quest log
- [ ] Notes
- [ ] Playing card library, with images (Maybe seperate, or integrate with items)
