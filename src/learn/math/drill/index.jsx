const helper = require('./helper');
const moment = require('moment');
const Options = require('./options');
const React = require('react');
const Running = require('./running');
const Finished = require('./finished');

function getScores() {
  let scores;
  try {
    scores = JSON.parse(localStorage.getItem('scores') || '[]');
  } catch (e) {
    scores = [];
  }
  return scores;
}

class MathDrill extends React.Component {
  constructor() {
    super();

    // TODO: opIndex, levelIndex to localStorage and restore at startup
    this.state = {
      currentTask: [],
      levelIndex: 0, // A
      lower: 1,
      opIndex: 0, // +
      previousResults: [], // previousResults results of quiz
      upper: 3,
      minutes: '1',
      totalProblems: '20',
    };

    this.checkAnswer = this.checkAnswer.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onStart = this.onStart.bind(this);
    this.reset = this.reset.bind(this);
    this.runningTotal = this.runningTotal.bind(this);
    this.save = this.save.bind(this);
    this.setNextTask = this.setNextTask.bind(this);
    this.onInterval = this.onInterval.bind(this);
    this.setParentState = this.setParentState.bind(this);
  }

  onInterval() {
    const {
      endTime,
    } = this.state;
    const timeLeft = Math.round(endTime.diff(moment()) / 1000);
    const timeIsUp = timeLeft <= 0;
    if (timeIsUp) {
      clearInterval(this.state.timerId);
    }
    const currentAction = timeIsUp ? 'finished' : this.state.currentAction;
    this.setState({
      currentAction,
      timeIsUp,
      timeLeft,
    });
  }

  onStart() {
    this.setNextTask();
    const { minutes = '1' } = this.state;
    const seconds = parseFloat(minutes, 10) * 60;
    const startTime = moment();
    const endTime = moment().add(seconds, 'seconds');
    const timerId = setInterval(this.onInterval, 1000);
    this.setState({
      currentAction: 'running',
      startTime,
      endTime,
      timerId,
      seconds,
      timeLeft: seconds,
    });
  }

  onChange(e) {
    const { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  }

  setParentState(state) {
    this.setState(state);
  }

  setNextTask() {
    const { levelIndex, opIndex, currentTask } = this.state;
    const nextTask = helper.getLowerUpper(levelIndex, opIndex);
    console.log('setNextTask', levelIndex, opIndex, nextTask);
    if (nextTask.every((item, index) => currentTask[index] === item)) {
      this.setNextTask();
    } else {
      this.setState({
        currentTask: nextTask,
      });
    }
  }

  getExpected(left, right) {
    switch (this.state.opIndex) {
      case 0:
        return left + right;
      case 1:
        return left - right;
      case 2:
        return left * right;
      case 3:
        return left / right;
      default:
        return 0;
    }
  }

  isSameProblem(left, right) {
    if (this.state.upper - this.state.lower < 3) {
      return false;
    }
    const newNumbers = [left, right].sort();
    const oldNumbers = [this.state.left, this.state.right].sort();
    return newNumbers[0] === oldNumbers[0] && newNumbers[1] === oldNumbers[1];
  }

  save() {
    const {
      startTime,
      correctCount,
      totalCount,
    } = this.state;
    if (totalCount) {
      const scores = getScores();
      const {
        lower,
        sign,
        upper,
      } = this.state;
      scores.unshift({
        correctCount,
        date: new Date().toISOString(),
        lower,
        sign,
        time: Math.round((Date.now() - startTime) / 1000),
        totalCount,
        upper,
      });
      if (scores.length > 10) {
        scores.pop();
      }
      localStorage.setItem('scores', JSON.stringify(scores));
      this.setState({ scores });
      this.reset();
    }
  }


  runningTotal() {
    const { correctCount, totalCount, startTime } = this.state;
    const seconds = Math.round((Date.now() - startTime) / 1000);
    return `${correctCount} / ${totalCount}  (${seconds}s)`;
  }

  reset() {
    this.setState({
      startTime: Date.now(),
      correctCount: 0,
      totalCount: 0,
    });
  }


  checkAnswer(answer) {
    const actual = parseInt(answer, 10);
    const { timeIsUp } = this.state;
    if (!isNaN(actual) && !timeIsUp) {
      const { currentTask: task, previousResults = [] } = this.state;
      let { correctCount, totalCount } = this.state;
      totalCount += 1;
      const [,,, expected] = task;
      const correct = actual === expected;
      if (correct) {
        correctCount += 1;
      }

      const { previousTime = this.state.startTime } = this.state;
      const timeTaken = Math.round(moment().diff(previousTime) / 100) / 10;

      previousResults.push({ task, actual, timeTaken, id: previousResults.length });
      this.setState({
        correct,
        correctCount,
        previousTime: moment(),
        result: `${actual} is ${correct ? 'correct' : 'wrong'}`,
        previousResults,
        totalCount,
      });

      if (correct) {
        this.setNextTask();
      }
    }
  }

  renderOptions() {
    // eslint-disable-next-line no-console
    console.log('state:', this.state);
    const {
      levelIndex,
      minutes,
      opIndex,
      totalProblems,
    } = this.state || {};
    return (
      <Options
        levelIndex={levelIndex}
        minutes={minutes}
        onChange={this.onChange}
        onStart={this.onStart}
        opIndex={opIndex}
        setParentState={this.setParentState}
        totalProblems={totalProblems}
      />
    );
  }

  renderRunning() {
    const {
      currentTask,
      levelIndex,
      opIndex,
      timeLeft,
      previousResults,
    } = this.state;

    return (
      <Running
        checkAnswer={this.checkAnswer}
        currentTask={currentTask}
        levelIndex={levelIndex}
        opIndex={opIndex}
        previousResults={previousResults}
        timeLeft={timeLeft}
      />
    );
  }

  renderFinished() {
    const {
      previousResults,
      seconds,
      timeLeft,
      totalProblems,
    } = this.state;
    return (
      <Finished
        previousResults={previousResults}
        timeAllowed={seconds}
        timeLeft={timeLeft}
        totalProblems={parseInt(totalProblems, 10)}
      />
    );
  }

  render() {
    const {
      currentAction = 'start',
    } = this.state || {};
    switch (currentAction) {
      case 'start':
        return this.renderOptions();
      case 'running':
        return this.renderRunning();
      case 'finished':
        return this.renderFinished();
      default:
        throw new Error(`Unknown currentAction ${currentAction}`);
    }
  }
}

module.exports = MathDrill;
