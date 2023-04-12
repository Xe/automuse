declare module "@xeserv/plottoriffic" {
  export default PlotGenerator;

  export type Character = {
    symbol: string;
    name: string;
    description: string;
  };

  export type Plot = {
    subject: string;
    group: string;
    subgroup: string;
    description: string;
    cast: Character[];
    plot: string;
  };

  export class PlotGenerator {
    constructor({ flipGenders }: { flipGenders?: boolean });

    generate(): Plot;
  }
}
