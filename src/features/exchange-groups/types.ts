export interface IExchangeSubgroup {
    id: number;
    exchange_group_id: number;
    name: string;
}

export interface IExchangeGroup {
    id: number;
    system_id?: number;
    name: string;
    avg_calories?: number;
    color_code?: string;
    exchange_subgroups?: IExchangeSubgroup[];
}
