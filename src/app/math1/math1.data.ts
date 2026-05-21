export interface Example {
  text: string;
}

export interface SubTopic {
  sub_topic: string;
  explanation: string;
  examples: string[];
}

export interface Topic {
  topic: string;
  sub_topics: SubTopic[];
}

export const MATH_TOPICS: Topic[] = [
  {
    topic: 'Counting as Action Tracking',
    sub_topics: [
      {
        sub_topic: 'Counting Touching Objects',
        explanation:
          'Counting touching objects involves using tactile methods—such as placing fingers, tapping, or arranging physical items—to visually and physically track quantities. This hands-on approach strengthens numerical intuition by linking counting to direct, observable interactions with materials. It is ideal for early learners to build foundational number sense through concrete manipulation.',
        examples: [
          "Place 5 red pom-poms in a basket and ask: 'If I remove two, how many will remain if I add three more?'",
          "Use 8 wooden spoons and arrange them in a spiral on a tray, then count by touching each one to find the total if two are hidden under a cup.",
          "Draw 15 dots on a large sheet of paper and ask: 'If I connect every dot with a line, how many lines will you touch if you start at the first dot and move clockwise?'",
          "Give a child 10 small plastic animals (e.g., frogs, snakes) and ask: 'If I place them in a row and then stack 4 of them vertically, how many animals are touching the ground?'",
          "Use a set of 20 interlocking cubes and ask: 'If I build a tower with 6 cubes and then add 7 more, how many cubes will be touching the table if I flatten the tower?'",
          "Arrange 12 seashells in a circular pattern on a beach towel and ask: 'If I pick up 3 shells and place them in a separate pile, how many shells are touching the towel?'",
          "Provide a child with 7 large buttons and ask: 'If I arrange them in a line and then add 5 more, how many buttons will be touching the floor if I stack them vertically?'",
          "Use a deck of 52 cards (excluding jokers) and ask: 'If I shuffle them and place 9 cards face-up, how many cards will be touching the table if I place 4 more on top?'",
          "Place 10 cotton balls in a clear container and ask: 'If I remove 3 and then add 6 more, how many cotton balls will be touching the sides of the container?'",
          "Draw 24 stars on a star-shaped paper and ask: 'If I connect every star to its neighbor by drawing a line, how many lines will be touching the center of the star?'",
          "Use 16 small toy cars and ask: 'If I park 5 cars in a row and then add 7 more, how many cars will be touching the wall if I line them up vertically?'",
          "Arrange 9 marbles in a triangular pyramid