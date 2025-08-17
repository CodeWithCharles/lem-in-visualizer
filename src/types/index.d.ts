interface Room {
	id:			String;
	x:			Number;
	y:			Number;
	z?:			Number;
	links?:		String[];
}

interface Link {
	from:		String;
	to:			String;
}

interface Ant {
	id: 		Number;
	position:	String;
}

interface Move {
	turn:		Number;
	ant:		Number;
	room:		String;
}