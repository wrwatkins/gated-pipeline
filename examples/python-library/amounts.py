from decimal import Decimal


def total(values):
    amounts = [Decimal(value) for value in values]
    if any(not value.is_finite() for value in amounts):
        raise ValueError('Expected finite amounts')
    return sum(amounts, Decimal(0))
