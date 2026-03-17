const Quiz = {
  generateQuestions(data, count = 10) {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    return selected.map(item => {
      const type = Math.random() > 0.5 ? "definition" : "example";
      const wrongChoices = data
        .filter(d => d.id !== item.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(d => d.name);

      const choices = [...wrongChoices, item.name].sort(
        () => Math.random() - 0.5
      );

      return {
        question:
          type === "definition"
            ? `Which ML type is defined as: "${item.definition.substring(0, 120)}..."`
            : `"${item.examples[0]}" is an example of which ML type?`,
        answer: item.name,
        choices,
        item
      };
    });
  },

  generateFlashcards(data) {
    return data.map(item => ({
      front: item.name,
      back: `${item.definition}\n\
Examples: ${item.examples.join(", ")}`
    }));
  }
};